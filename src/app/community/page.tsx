"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { useReptileLogs } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
    MessageSquare, X, Image as ImageIcon,
    LogIn, LogOut, Loader2, Tag, Turtle
} from "lucide-react";
import { AuthDialog } from "@/components/auth-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ReptileTagModal } from "./components/reptile-tag-modal";
import { ko, enUS } from "date-fns/locale";
import { Post } from "./types";
import { motion } from "framer-motion";
import { PostCard } from "./components/post-card";
import { cn } from "@/lib/utils";

export default function CommunityPage() {
    const { t } = useTranslation();
    const { session, visualSettings, reptiles: myReptiles } = useReptileLogs();
    const [showAuthDialog, setShowAuthDialog] = useState(false);

    // Feed State
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [selectedTagReptileId, setSelectedTagReptileId] = useState<string | null>(null);
    const [showTagModal, setShowTagModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Profile State
    const [myProfile, setMyProfile] = useState<any>(null);
    const [likingPostId, setLikingPostId] = useState<string | null>(null);

    // Delete confirmation state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState<string | null>(null);

    // Edit state
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [editTagReptileId, setEditTagReptileId] = useState<string | null>(null);
    const [showEditTagModal, setShowEditTagModal] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const locale = visualSettings.language === 'ko' ? ko : enUS;

    // Fetch Posts with like status
    const fetchPosts = async () => {
        setIsLoading(true);

        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles:profiles!posts_user_id_fkey ( username, full_name, avatar_url ),
                likes(count),
                comments(count),
                reptiles:reptile_id ( name, species, photo_url )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching posts:", error);
        } else if (data) {
            // Check which posts the user has liked
            let likedPostIds: string[] = [];
            if (session?.user) {
                const { data: likes } = await supabase
                    .from('likes')
                    .select('post_id')
                    .eq('user_id', session.user.id);
                likedPostIds = likes?.map(l => l.post_id) || [];
            }

            const postsWithLikes: Post[] = data.map((post: any) => ({
                ...post,
                image_urls: Array.isArray(post.image_urls) ? post.image_urls : [],
                likes_count: post.likes && post.likes[0] ? post.likes[0].count : 0,
                comments_count: post.comments && post.comments[0] ? post.comments[0].count : 0,
                isLiked: likedPostIds.includes(post.id)
            }));
            setPosts(postsWithLikes);
        }
        setIsLoading(false);
    };

    // Fetch My Profile
    useEffect(() => {
        if (session?.user) {
            supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
                .then(({ data }) => setMyProfile(data));
        } else {
            setMyProfile(null);
        }
    }, [session]);

    useEffect(() => {
        fetchPosts();

        // Subscribe to post, like, and comment changes
        const channel = supabase
            .channel('community-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
                fetchPosts();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
                fetchPosts();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
                fetchPosts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session]);

    // Handle image selection
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const remainingSlots = 4 - selectedImages.length;

        if (files.length > remainingSlots) {
            alert(`최대 4장까지 선택 가능합니다. (현재 ${selectedImages.length}장 선택됨, ${remainingSlots}장 더 추가 가능)`);
            e.target.value = ''; // Reset input
            return;
        }

        const newFiles = files.slice(0, remainingSlots);
        setSelectedImages(prev => [...prev, ...newFiles]);

        // Create previews
        newFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });

        e.target.value = ''; // Reset input for next selection
    };

    const removeImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    // Upload images to Supabase Storage
    const uploadImages = async (): Promise<string[]> => {
        if (!session?.user || selectedImages.length === 0) return [];

        const urls: string[] = [];
        const failedFiles: string[] = [];

        for (const file of selectedImages) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error } = await supabase.storage
                .from('posts')
                .upload(fileName, file);

            if (!error) {
                const { data: urlData } = supabase.storage
                    .from('posts')
                    .getPublicUrl(fileName);
                urls.push(urlData.publicUrl);
            } else {
                console.error(`Failed to upload ${file.name}:`, error);
                failedFiles.push(file.name);
            }
        }

        if (failedFiles.length > 0) {
            alert(`일부 이미지 업로드 실패: ${failedFiles.join(', ')}`);
        }

        return urls;
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && selectedImages.length === 0) return;
        if (!session) {
            setShowAuthDialog(true);
            return;
        }

        setIsPosting(true);
        try {
            // Upload images first
            const imageUrls = await uploadImages();

            const { error } = await supabase.from('posts').insert({
                content: newPostContent,
                user_id: session.user.id,
                image_urls: imageUrls,
                reptile_id: selectedTagReptileId
            });

            if (!error) {
                setNewPostContent("");
                setSelectedImages([]);
                setImagePreviews([]);
                setSelectedTagReptileId(null);
                // Manually refresh posts since realtime might not be enabled
                await fetchPosts();
            } else {
                console.error('Post error:', error);
                alert(t("community.post_failed") + ": " + error.message);
            }
        } catch (err) {
            console.error('Error creating post:', err);
            alert(t("community.post_error"));
        }
        setIsPosting(false);
    };

    const handleLike = async (postId: string, isLiked: boolean) => {
        if (!session) {
            setShowAuthDialog(true);
            return;
        }

        // Prevent concurrent likes on the same post
        if (likingPostId === postId) return;
        setLikingPostId(postId);

        // Store original state for rollback
        const originalPost = posts.find(p => p.id === postId);
        if (!originalPost) {
            setLikingPostId(null);
            return;
        }

        // Optimistic update
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                return {
                    ...p,
                    isLiked: !isLiked,
                    likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1
                };
            }
            return p;
        }));

        try {
            if (isLiked) {
                const { error: deleteError } = await supabase
                    .from('likes')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', session.user.id);

                if (deleteError) throw deleteError;

                // Get current count from DB to avoid stale data
                const { data: postData } = await supabase
                    .from('posts')
                    .select('likes_count')
                    .eq('id', postId)
                    .single();

                const currentCount = postData?.likes_count || 0;
                await supabase
                    .from('posts')
                    .update({ likes_count: Math.max(0, currentCount - 1) })
                    .eq('id', postId);
            } else {
                const { error: insertError } = await supabase.from('likes').insert({
                    post_id: postId,
                    user_id: session.user.id
                });

                if (insertError) throw insertError;

                // Get current count from DB to avoid stale data
                const { data: postData } = await supabase
                    .from('posts')
                    .select('likes_count')
                    .eq('id', postId)
                    .single();

                const currentCount = postData?.likes_count || 0;
                await supabase
                    .from('posts')
                    .update({ likes_count: currentCount + 1 })
                    .eq('id', postId);
            }
        } catch (error) {
            console.error('Like error:', error);
            // Rollback optimistic update
            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    return { ...p, isLiked: originalPost.isLiked, likes_count: originalPost.likes_count };
                }
                return p;
            }));
        } finally {
            setLikingPostId(null);
        }
    };

    const promptDelete = (postId: string) => {
        setPostToDelete(postId);
        setDeleteConfirmOpen(true);
    };

    const handleDeletePost = async () => {
        if (!postToDelete) return;

        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postToDelete);

        if (!error) {
            setPosts(prev => prev.filter(p => p.id !== postToDelete));
        } else {
            console.error(error);
            alert("삭제 실패");
        }
        setPostToDelete(null);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const promptEdit = (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (post) {
            setEditingPostId(postId);
            setEditContent(post.content || "");
            setEditTagReptileId(post.reptile_id || null);
        }
    };

    const handleUpdatePost = async () => {
        if (!editingPostId || !editContent.trim()) return;

        setIsUpdating(true);
        const { error } = await supabase
            .from('posts')
            .update({
                content: editContent,
                reptile_id: editTagReptileId
            })
            .eq('id', editingPostId);

        if (!error) {
            // Fetch updated post with reptile info
            const { data: updatedPost } = await supabase
                .from('posts')
                .select(`
                    *,
                    profiles!posts_user_id_fkey(username, full_name, avatar_url),
                    reptiles(id, name, species, photo_url)
                `)
                .eq('id', editingPostId)
                .single();

            if (updatedPost) {
                setPosts(prev => prev.map(p => {
                    if (p.id === editingPostId) {
                        return { ...updatedPost, isLiked: p.isLiked, image_urls: (updatedPost.image_urls as any) || [] } as Post;
                    }
                    return p;
                }));
            }
            setEditingPostId(null);
            setEditContent("");
            setEditTagReptileId(null);
        } else {
            console.error(error);
            alert("수정 실패");
        }
        setIsUpdating(false);
    };

    const cancelEdit = () => {
        setEditingPostId(null);
        setEditContent("");
        setEditTagReptileId(null);
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [newPostContent]);

    return (
        <div className="min-h-screen bg-[var(--background)] pb-24 text-[var(--foreground)]">
            {showAuthDialog && <AuthDialog onClose={() => setShowAuthDialog(false)} />}

            {/* Edit Modal */}
            {editingPostId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-lg bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-[var(--border)]">
                            <h3 className="text-lg font-black text-[var(--foreground)]">{t("common.edit_post")}</h3>
                        </div>
                        <div className="p-6">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full min-h-[150px] bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 text-sm outline-none focus:border-[var(--primary)] transition-colors resize-none"
                                placeholder="내용을 입력하세요..."
                            />

                            {/* Tag Button */}
                            <div className="mt-4">
                                <button
                                    onClick={() => setShowEditTagModal(true)}
                                    disabled={myReptiles.length === 0}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all disabled:opacity-30 border-2",
                                        editTagReptileId
                                            ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] shadow-lg shadow-[var(--primary)]/10"
                                            : "border-transparent text-[var(--muted)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                                    )}
                                >
                                    {editTagReptileId ? (() => {
                                        const r = myReptiles.find(rep => rep.id === editTagReptileId);
                                        if (!r) return <Turtle className="h-5 w-5" />;
                                        const isImg = r.avatar.startsWith('data:') || r.avatar.startsWith('http');
                                        return (
                                            <div className="flex items-center gap-2">
                                                <div className="h-5 w-5 rounded-full overflow-hidden flex items-center justify-center border border-[var(--primary)]/30 bg-[var(--card)]">
                                                    {isImg ? (
                                                        <img src={r.avatar} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span className="text-[10px]">{r.avatar}</span>
                                                    )}
                                                </div>
                                                <span className="text-xs font-black">{r.name}</span>
                                            </div>
                                        );
                                    })() : (
                                        <>
                                            <Turtle className="h-5 w-5" />
                                            <span className="text-xs font-bold">{t("community.tag_pet")}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            <button
                                onClick={cancelEdit}
                                disabled={isUpdating}
                                className="flex-1 h-12 rounded-2xl font-bold bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 text-[var(--foreground)] transition-colors disabled:opacity-50"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleUpdatePost}
                                disabled={isUpdating || !editContent.trim()}
                                className="flex-1 h-12 rounded-2xl font-bold bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white transition-all disabled:opacity-50 shadow-lg shadow-[var(--primary)]/20"
                            >
                                {isUpdating ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "수정 완료"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Edit Tag Modal */}
            <ReptileTagModal
                isOpen={showEditTagModal}
                onClose={() => setShowEditTagModal(false)}
                reptiles={myReptiles}
                selectedId={editTagReptileId}
                onSelect={setEditTagReptileId}
            />

            {/* Header */}
            <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[var(--background)]/80 border-b border-[var(--border)]">
                <div className="mx-auto max-w-xl px-4 h-14 flex items-center justify-between">
                    <h1 className="text-lg font-black tracking-tight">{t("nav.community")}</h1>

                    <div className="flex items-center gap-2">
                        {session ? (
                            <button onClick={handleLogout} className="p-2 rounded-full hover:bg-[var(--secondary)] transition-colors text-[var(--muted)]">
                                <LogOut className="h-5 w-5" />
                            </button>
                        ) : (
                            <button onClick={() => setShowAuthDialog(true)} className="flex items-center gap-1 bg-[var(--primary)] text-white px-3 py-1.5 rounded-full text-xs font-bold">
                                <LogIn className="h-3 w-3" />
                                <span>Login</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="mx-auto max-w-xl p-4 space-y-4">
                {/* Create Post Card */}
                <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] space-y-3">
                    <div className="flex gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-500/20 overflow-hidden flex items-center justify-center text-xl shrink-0">
                            {myProfile?.avatar_url ? (
                                <img src={myProfile.avatar_url} alt="me" className="h-full w-full object-cover" />
                            ) : (
                                "👤"
                            )}
                        </div>
                        <div className="flex-1 flex flex-col pt-1">
                            <textarea
                                ref={textareaRef}
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder={session ? t("community.whats_happening") : "로그인하고 게시하기..."}
                                disabled={!session}
                                rows={2}
                                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)] resize-none transition-[height] duration-100 ease-out overflow-y-auto"
                            />
                        </div>
                    </div>

                    {/* Image Previews */}
                    {imagePreviews.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {imagePreviews.map((preview, idx) => (
                                <div key={idx} className="relative shrink-0">
                                    <img src={preview} alt="" className="h-20 w-20 object-cover rounded-lg" />
                                    <button
                                        onClick={() => removeImage(idx)}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!session || selectedImages.length >= 4}
                                className="p-2 text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-full transition-colors disabled:opacity-30 relative"
                                title="사진 추가"
                            >
                                <ImageIcon className="h-5.5 w-5.5" />
                                {selectedImages.length > 0 && (
                                    <span className="absolute top-1 right-1 bg-[var(--primary)] text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-[var(--card)]">
                                        {selectedImages.length}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setShowTagModal(true)}
                                disabled={!session || myReptiles.length === 0}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all disabled:opacity-30 border-2",
                                    selectedTagReptileId
                                        ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] shadow-lg shadow-[var(--primary)]/10"
                                        : "border-transparent text-[var(--muted)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                                )}
                                title="파충류 태그"
                            >
                                {selectedTagReptileId ? (() => {
                                    const r = myReptiles.find(rep => rep.id === selectedTagReptileId);
                                    if (!r) return <Turtle className="h-5 w-5" />;
                                    const isImg = r.avatar.startsWith('data:') || r.avatar.startsWith('http');
                                    return (
                                        <div className="flex items-center gap-2">
                                            <div className="h-5 w-5 rounded-full overflow-hidden flex items-center justify-center border border-[var(--primary)]/30 bg-[var(--card)]">
                                                {isImg ? (
                                                    <img src={r.avatar} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-[10px]">{r.avatar}</span>
                                                )}
                                            </div>
                                            <span className="text-xs font-black">{r.name}</span>
                                        </div>
                                    );
                                })() : (
                                    <>
                                        <Turtle className="h-5 w-5" />
                                        <span className="text-xs font-bold">{t("community.tag_pet")}</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <button
                            onClick={handleCreatePost}
                            disabled={isPosting || (!newPostContent.trim() && selectedImages.length === 0)}
                            className="px-6 py-2 rounded-full bg-[var(--primary)] text-white font-black text-sm disabled:opacity-50 hover:opacity-90 transition-all shadow-lg shadow-[var(--primary)]/20 active:scale-95"
                        >
                            {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("community.post")}
                        </button>
                    </div>
                </div>

                {/* Feed */}
                {isLoading ? (
                    <div className="py-20 text-center text-[var(--muted)]">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p className="text-xs">Loading feed...</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="py-20 text-center text-[var(--muted)] opacity-50">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>첫 번째 게시물을 작성해보세요!</p>
                    </div>
                ) : (
                    posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            locale={locale}
                            isOwner={session?.user?.id === post.user_id}
                            onLike={() => handleLike(post.id, post.isLiked || false)}
                            onDelete={() => promptDelete(post.id)}
                            onEdit={() => promptEdit(post.id)}
                        />
                    ))
                )}
            </main>

            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDeletePost}
                title={t("common.delete")}
                description="이 게시물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                confirmText={t("common.delete")}
                cancelText={t("common.cancel")}
                variant="danger"
            />

            <ReptileTagModal
                isOpen={showTagModal}
                onClose={() => setShowTagModal(false)}
                reptiles={myReptiles}
                selectedId={selectedTagReptileId}
                onSelect={setSelectedTagReptileId}
            />
        </div>
    );
}
