"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { useReptileLogs } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { PostCard } from "../components/post-card";
import { Post } from "../types";
import { Loader2, ChevronLeft, AlertCircle } from "lucide-react";
import { ko, enUS } from "date-fns/locale";
import { AuthDialog } from "@/components/auth-dialog";

export default function PostDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const { session, visualSettings } = useReptileLogs();

    const [post, setPost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAuthDialog, setShowAuthDialog] = useState(false);
    const [likingPostId, setLikingPostId] = useState<string | null>(null);

    // Safely handle id from params
    const id = params?.id && (Array.isArray(params.id) ? params.id[0] : params.id);

    const locale = visualSettings.language === 'ko' ? ko : enUS;

    useEffect(() => {
        const fetchPost = async () => {
            if (!id) return;
            setIsLoading(true);

            // Fetch post
            const { data, error } = await supabase
                .from('posts')
                .select(`
                    *,
                    profiles:profiles!posts_user_id_fkey ( username, full_name, avatar_url )
                `)
                .eq('id', id)
                .single();

            if (error) {
                console.error("Error fetching post:", error);
                setError("게시글을 불러올 수 없습니다.");
                setIsLoading(false);
                return;
            }

            if (data) {
                let isLiked = false;
                if (session?.user) {
                    const { data: likeData } = await supabase
                        .from('likes')
                        .select('post_id')
                        .eq('user_id', session.user.id)
                        .eq('post_id', id)
                        .single();
                    if (likeData) isLiked = true;
                }

                setPost({
                    ...data,
                    image_urls: Array.isArray(data.image_urls) ? data.image_urls.map((url: any) => String(url)) : [],
                    likes_count: data.likes_count || 0,
                    isLiked
                });
            }
            setIsLoading(false);
        };

        fetchPost();
    }, [id, session]);

    const handleLike = async (postId: string, isLiked: boolean) => {
        if (!session) {
            setShowAuthDialog(true);
            return;
        }

        if (likingPostId === postId || !post) return;
        setLikingPostId(postId);

        // Optimistic update
        const originalPost = { ...post };
        setPost({
            ...post,
            isLiked: !isLiked,
            likes_count: isLiked ? post.likes_count - 1 : post.likes_count + 1
        });

        try {
            if (isLiked) {
                const { error: deleteError } = await supabase
                    .from('likes')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', session.user.id);

                if (deleteError) throw deleteError;

                const { data: postData } = await supabase
                    .from('posts')
                    .select('likes_count')
                    .eq('id', postId)
                    .single();

                if (postData) {
                    await supabase.from('posts').update({ likes_count: Math.max(0, (postData.likes_count || 0) - 1) }).eq('id', postId);
                }
            } else {
                const { error: insertError } = await supabase.from('likes').insert({
                    post_id: postId,
                    user_id: session.user.id
                });

                if (insertError) throw insertError;

                const { data: postData } = await supabase
                    .from('posts')
                    .select('likes_count')
                    .eq('id', postId)
                    .single();

                if (postData) {
                    await supabase.from('posts').update({ likes_count: (postData.likes_count || 0) + 1 }).eq('id', postId);
                }
            }
        } catch (error) {
            console.error('Like error:', error);
            setPost(originalPost);
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
            router.push('/community');
        } else {
            alert("삭제 실패: " + error.message);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--muted)]" />
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center gap-4 text-[var(--muted)]">
                <AlertCircle className="h-12 w-12 opacity-50" />
                <p>{error || "게시글을 찾을 수 없습니다."}</p>
                <button
                    onClick={() => router.push('/community')}
                    className="text-[var(--primary)] hover:underline"
                >
                    목록으로 돌아가기
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] pb-24 text-[var(--foreground)]">
            {showAuthDialog && <AuthDialog onClose={() => setShowAuthDialog(false)} />}

            {/* Header */}
            <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[var(--background)]/80 border-b border-[var(--border)]">
                <div className="px-4 h-14 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-1 -ml-1 rounded-full hover:bg-[var(--secondary)] transition-colors"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-black tracking-tight">게시글</h1>
                </div>
            </header>

            <main className="p-4">
                <PostCard
                    post={post}
                    locale={locale}
                    isOwner={session?.user?.id === post.user_id}
                    onLike={() => handleLike(post.id, post.isLiked || false)}
                    onDelete={() => handleDeletePost(post.id)}
                />
            </main>
        </div>
    );
}
