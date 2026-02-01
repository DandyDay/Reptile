"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { useReptileLogs } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
    Users, MessageSquare, Heart, X, Image as ImageIcon,
    MoreHorizontal, Share2, MessageCircle, ChevronLeft, ChevronRight,
    LogIn, LogOut, Loader2, Trash2, Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthDialog } from "@/components/auth-dialog";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";

interface Post {
    id: string;
    content: string;
    image_urls: string[];
    created_at: string;
    likes_count: number;
    user_id: string;
    profiles: {
        username: string;
        full_name: string;
        avatar_url: string;
    } | null;
    isLiked?: boolean;
}

interface Comment {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: {
        username: string;
        full_name: string;
        avatar_url: string;
    } | null;
}

export default function CommunityPage() {
    const { t } = useTranslation();
    const { session, visualSettings } = useReptileLogs();
    const [showAuthDialog, setShowAuthDialog] = useState(false);

    // Feed State
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Profile State
    const [myProfile, setMyProfile] = useState<any>(null);
    const [likingPostId, setLikingPostId] = useState<string | null>(null);

    const locale = visualSettings.language === 'ko' ? ko : enUS;

    // Fetch Posts with like status
    const fetchPosts = async () => {
        setIsLoading(true);

        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles:profiles!posts_user_id_fkey ( username, full_name, avatar_url )
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
                likes_count: post.likes_count || 0,
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

        // Subscribe to post changes
        const channel = supabase
            .channel('posts-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
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
        if (files.length + selectedImages.length > 4) {
            alert('최대 4장까지 선택 가능합니다.');
            return;
        }

        const newFiles = files.slice(0, 4 - selectedImages.length);
        setSelectedImages(prev => [...prev, ...newFiles]);

        // Create previews
        newFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
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
                image_urls: imageUrls
            });

            if (!error) {
                setNewPostContent("");
                setSelectedImages([]);
                setImagePreviews([]);
                // Manually refresh posts since realtime might not be enabled
                await fetchPosts();
            } else {
                console.error('Post error:', error);
                alert("게시 실패: " + error.message);
            }
        } catch (err) {
            console.error('Error creating post:', err);
            alert("게시 중 오류가 발생했습니다.");
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

    const handleDeletePost = async (postId: string) => {
        if (!confirm('이 게시물을 삭제하시겠습니까?')) return;

        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);

        if (!error) {
            setPosts(prev => prev.filter(p => p.id !== postId));
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="min-h-screen bg-[var(--background)] pb-24 text-[var(--foreground)]">
            {showAuthDialog && <AuthDialog onClose={() => setShowAuthDialog(false)} />}

            {/* Header */}
            <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[var(--background)]/80 border-b border-[var(--border)]">
                <div className="px-4 h-14 flex items-center justify-between">
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
            <main className="p-4 space-y-4">
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
                        <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder={session ? t("community.whats_happening") : "로그인하고 게시하기..."}
                            disabled={!session}
                            rows={2}
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)] resize-none"
                        />
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

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            accept="image/*"
                            multiple
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!session || selectedImages.length >= 4}
                            className="flex items-center gap-1 text-[var(--primary)] text-sm font-medium disabled:opacity-50"
                        >
                            <ImageIcon className="h-5 w-5" />
                            <span>사진 {selectedImages.length}/4</span>
                        </button>
                        <button
                            onClick={handleCreatePost}
                            disabled={isPosting || (!newPostContent.trim() && selectedImages.length === 0)}
                            className="px-4 py-1.5 rounded-full bg-[var(--primary)] text-white font-bold text-sm disabled:opacity-50"
                        >
                            {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : "게시"}
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
                            onDelete={() => handleDeletePost(post.id)}
                        />
                    ))
                )}
            </main>
        </div>
    );
}

// Post Card Component
function PostCard({
    post,
    locale,
    isOwner,
    onLike,
    onDelete
}: {
    post: Post;
    locale: any;
    isOwner: boolean;
    onLike: () => void;
    onDelete: () => void;
}) {
    const { t } = useTranslation();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showMenu, setShowMenu] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const images = post.image_urls || [];
    const hasImages = images.length > 0;

    // Drag to scroll state
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
        setCurrentImageIndex(index);
    };

    const scrollTo = (index: number) => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTo({
            left: index * scrollRef.current.offsetWidth,
            behavior: 'smooth'
        });
    };

    const onMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        isDragging.current = true;
        startX.current = e.pageX - scrollRef.current.offsetLeft;
        scrollLeft.current = scrollRef.current.scrollLeft;
        scrollRef.current.style.scrollBehavior = 'auto'; // Disable smooth scroll while dragging
        scrollRef.current.style.cursor = 'grabbing';
    };

    const onMouseLeave = () => {
        if (!isDragging.current) return;
        isDragging.current = false;
        if (scrollRef.current) {
            scrollRef.current.style.scrollBehavior = 'smooth';
            scrollRef.current.style.cursor = 'grab';
        }
    };

    const onMouseUp = () => {
        if (!isDragging.current) return;
        isDragging.current = false;
        if (scrollRef.current) {
            scrollRef.current.style.scrollBehavior = 'smooth';
            scrollRef.current.style.cursor = 'grab';

            // Snap to nearest image on release
            const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
            scrollTo(index);
        }
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX.current) * 1.5; // Scroll speed multiplier
        scrollRef.current.scrollLeft = scrollLeft.current - walk;
    };

    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isCommentsLoading, setIsCommentsLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [isSendingComment, setIsSendingComment] = useState(false);
    const [commentCount, setCommentCount] = useState(0); // Optional: if we fetched count
    const [hasLoadedComments, setHasLoadedComments] = useState(false);

    // Initial load of comment count (optional optimization)
    // For now, we'll just fetch comments when toggled or lazy load count? 
    // Let's just fetch everything when toggled for simplicity first.

    const fetchComments = async () => {
        setIsCommentsLoading(true);
        const { data, error } = await supabase
            .from('comments')
            .select(`
                *,
                profiles ( username, full_name, avatar_url )
            `)
            .eq('post_id', post.id)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setComments(data as any);
            setCommentCount(data.length);
        }
        setIsCommentsLoading(false);
        setHasLoadedComments(true);
    };

    const toggleComments = () => {
        if (!showComments && !hasLoadedComments) {
            fetchComments();
        }
        setShowComments(!showComments);
    };

    const handleSendComment = async () => {
        if (!newComment.trim()) return;

        // We need session to comment. 
        // PostCard doesn't have session prop directly but `isOwner` check implies we have session access in parent.
        // However, we should check session existence.
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            alert(t("community.login_required"));
            return;
        }

        setIsSendingComment(true);
        const { data, error } = await supabase
            .from('comments')
            .insert({
                content: newComment,
                post_id: post.id,
                user_id: session.user.id
            })
            .select(`
                *,
                profiles ( username, full_name, avatar_url )
            `)
            .single();

        if (!error && data) {
            setComments(prev => [...prev, data as any]);
            setCommentCount(prev => prev + 1);
            setNewComment("");
        } else {
            console.error(error);
            alert(t("community.comment_failed"));
        }
        setIsSendingComment(false);
    };

    const handleShare = async () => {
        const shareData = {
            title: 'ReptileLog',
            text: post.content || 'Check out this reptile!',
            url: window.location.href, // This might be just the feed URL, but better than nothing
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert(t("community.share_success"));
        }
    };

    // Calculate count from initial load if possible, but for now we rely on fetch
    // A better approach would be to fetch comment counts in the main feed query.
    // We'll leave the count as 0 initially or '...' until clicked for MVP.

    return (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
            {/* Header */}
            <div className="p-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-500/10 overflow-hidden flex items-center justify-center text-xl border border-indigo-500/20">
                        {post.profiles?.avatar_url ? (
                            <img src={post.profiles.avatar_url} alt="av" className="h-full w-full object-cover" />
                        ) : "🦎"}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--foreground)]">
                            {post.profiles?.full_name || post.profiles?.username || "Unknown"}
                        </h3>
                        <p className="text-[10px] text-[var(--muted)] font-medium">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale })}
                        </p>
                    </div>
                </div>
                {isOwner && (
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="text-[var(--muted)] hover:text-[var(--foreground)] p-1"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                <div className="absolute right-0 top-6 z-20 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden">
                                    <button
                                        onClick={() => { onDelete(); setShowMenu(false); }}
                                        className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 w-full"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="text-sm">{t("common.delete")}</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            {post.content && (
                <p className="px-4 pb-3 text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                    {post.content}
                </p>
            )}

            {/* Images */}
            {hasImages && (
                <div className="relative group">
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        onMouseDown={onMouseDown}
                        onMouseLeave={onMouseLeave}
                        onMouseUp={onMouseUp}
                        onMouseMove={onMouseMove}
                        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none cursor-grab active:cursor-grabbing"
                    >
                        {images.map((url, idx) => (
                            <div key={idx} className="min-w-full aspect-square bg-black/20 overflow-hidden snap-center relative">
                                <img
                                    src={url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                    {images.length > 1 && (
                        <>
                            {currentImageIndex > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        scrollTo(currentImageIndex - 1);
                                    }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                            )}
                            {currentImageIndex < images.length - 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        scrollTo(currentImageIndex + 1);
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            )}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 p-1 rounded-full bg-black/20 backdrop-blur-sm">
                                {images.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                            idx === currentImageIndex ? "bg-white w-3" : "bg-white/40"
                                        )}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="p-4 flex items-center justify-between border-t border-[var(--border)]">
                <button
                    onClick={onLike}
                    className={cn(
                        "flex items-center gap-1.5 transition-colors group",
                        post.isLiked ? "text-red-500" : "text-[var(--muted)] hover:text-red-500"
                    )}
                >
                    <Heart className={cn("h-5 w-5 group-hover:scale-110 transition-transform", post.isLiked && "fill-current")} />
                    <span className="text-xs font-medium">{post.likes_count}</span>
                </button>
                <button
                    onClick={toggleComments}
                    className={cn(
                        "flex items-center gap-1.5 transition-colors",
                        showComments ? "text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--primary)]"
                    )}
                >
                    <MessageCircle className="h-5 w-5" />
                    <span className="text-xs font-medium">{commentCount > 0 ? commentCount : t("community.comments")}</span>
                </button>
                <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                    <Share2 className="h-5 w-5" />
                </button>
            </div>

            {/* Comments Section */}
            <AnimatePresence>
                {showComments && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-[var(--border)] bg-[var(--background)]/50"
                    >
                        <div className="p-4 space-y-4">
                            {/* Comment Input */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder={t("community.write_comment")}
                                    className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-full px-4 py-2 text-sm outline-none focus:border-[var(--primary)]"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                                />
                                <button
                                    onClick={handleSendComment}
                                    disabled={!newComment.trim() || isSendingComment}
                                    className="p-2 bg-[var(--primary)] text-white rounded-full disabled:opacity-50"
                                >
                                    {isSendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </button>
                            </div>

                            {/* Comment List */}
                            {isCommentsLoading ? (
                                <div className="text-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-[var(--muted)]" />
                                </div>
                            ) : comments.length === 0 ? (
                                <p className="text-center text-xs text-[var(--muted)] py-2">{t("community.no_comments")}</p>
                            ) : (
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                                    {comments.map((comment) => (
                                        <div key={comment.id} className="flex gap-2.5">
                                            <div className="h-8 w-8 rounded-full bg-slate-500/20 shrink-0 overflow-hidden">
                                                {comment.profiles?.avatar_url ? (
                                                    <img src={comment.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                                                ) : "👤"}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-[var(--foreground)]">
                                                        {comment.profiles?.full_name || "Unknown"}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--muted)]">
                                                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-[var(--foreground)] leading-snug">
                                                    {comment.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
