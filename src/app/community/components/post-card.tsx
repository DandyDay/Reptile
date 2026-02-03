"use client";

import React, { useState, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
    MoreHorizontal, Share2, MessageCircle, ChevronLeft, ChevronRight,
    Loader2, Trash2, Send, Heart, Edit3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Post, Comment } from "../types";
import { AuthDialog } from "@/components/auth-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface PostCardProps {
    post: Post;
    locale: any;
    isOwner: boolean;
    onLike: () => void;
    onDelete: () => void;
    onEdit: () => void;
}

export function PostCard({
    post,
    locale,
    isOwner,
    onLike,
    onDelete,
    onEdit
}: PostCardProps) {
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
    const [commentCount, setCommentCount] = useState(post.comments_count || 0);
    const [hasLoadedComments, setHasLoadedComments] = useState(false);
    const [showAuthDialog, setShowAuthDialog] = useState(false);

    // Sync with props when they change (due to realtime updates in parent)
    React.useEffect(() => {
        if (post.comments_count !== undefined) {
            setCommentCount(post.comments_count);
        }
    }, [post.comments_count]);

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

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            setShowAuthDialog(true);
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
        const shareUrl = `${window.location.origin}/community/${post.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    url: shareUrl
                });
            } catch (err) {
                console.log('Error sharing', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                alert(t("community.share_success"));
            } catch (err) {
                console.error('Failed to copy', err);
                alert("링크 복사에 실패했습니다.");
            }
        }
    };

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
                        <div className="flex items-center gap-2 max-w-[200px] sm:max-w-[300px]">
                            <h3 className="text-sm font-bold text-[var(--foreground)] truncate">
                                {post.profiles?.full_name || post.profiles?.username || "Unknown"}
                            </h3>
                            {post.reptiles && (() => {
                                const isReptileImage = post.reptiles.photo_url?.startsWith("data:") || post.reptiles.photo_url?.startsWith("http");
                                return (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--primary)]/5 border border-[var(--primary)]/10 group-hover:bg-[var(--primary)]/10 transition-colors shrink-0 max-w-[120px]">
                                        <div className="h-4 w-4 rounded-full overflow-hidden bg-[var(--card)] flex items-center justify-center border border-[var(--primary)]/20 shrink-0">
                                            {isReptileImage ? (
                                                <img src={post.reptiles.photo_url!} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="text-[10px] select-none leading-none">{post.reptiles.photo_url || "🦎"}</span>
                                            )}
                                        </div>
                                        <div className="flex items-baseline gap-1 min-w-0">
                                            <span className="text-[10px] font-black text-[var(--primary)] leading-none truncate">
                                                {post.reptiles.name}
                                            </span>
                                            <span className="text-[9px] text-[var(--muted)] font-medium leading-none truncate">
                                                {post.reptiles.species}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
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
                                <div className="absolute right-0 top-6 z-20 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                                    <button
                                        onClick={() => { onEdit(); setShowMenu(false); }}
                                        className="flex items-center gap-2 px-4 py-2.5 text-[var(--foreground)] hover:bg-[var(--secondary)] w-full transition-colors"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                        <span className="text-sm font-medium">{t("common.edit")}</span>
                                    </button>
                                    <div className="h-px bg-[var(--border)]" />
                                    <button
                                        onClick={() => { onDelete(); setShowMenu(false); }}
                                        className="flex items-center gap-2 px-4 py-2.5 text-red-500 hover:bg-red-500/10 w-full transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="text-sm font-medium">{t("common.delete")}</span>
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

            {showAuthDialog && (
                <div className="fixed inset-0 z-[110]">
                    <AuthDialog onClose={() => setShowAuthDialog(false)} />
                </div>
            )}
        </div>
    );
}
