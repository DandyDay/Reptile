"use client";

import React, { useState, useRef, useEffect } from "react";
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
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setCurrentUserId(data.session?.user?.id || null);
        });
    }, []);

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

    const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
    const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
    const [activePressId, setActivePressId] = useState<string | null>(null);
    const pressTimer = useRef<NodeJS.Timeout | null>(null);

    const startPress = (id: string, isOwner: boolean, event: React.MouseEvent | React.TouchEvent) => {
        if (!isOwner) return;
        setActivePressId(id);

        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();

        pressTimer.current = setTimeout(() => {
            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }
            setMenuPosition({ top: rect.top, right: window.innerWidth - rect.right + 8 });
            setCommentMenuId(id);
            setActivePressId(null);
        }, 600);
    };

    const cancelPress = () => {
        setActivePressId(null);
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };

    const handleDeleteCommentClick = (commentId: string) => {
        setCommentToDelete(commentId);
    };

    const executeDeleteComment = async () => {
        if (!commentToDelete) return;

        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentToDelete);

        if (!error) {
            setComments(prev => prev.filter(c => c.id !== commentToDelete));
            setCommentCount(prev => Math.max(0, prev - 1));
        } else {
            console.error(error);
            alert("삭제 실패");
        }
        setCommentToDelete(null);
        setCommentMenuId(null);
    };

    const [replyTo, setReplyTo] = useState<{ commentId: string, authorName: string, authorId: string, parentId?: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleReply = (commentId: string, authorName: string, authorId: string, parentId?: string) => {
        // If it's a rely to a reply, use the original parentId. If it's a reply to root, use the commentId as parentId.
        const targetParentId = parentId || commentId;
        setReplyTo({ commentId, authorName, authorId, parentId: targetParentId });
        inputRef.current?.focus();
    };

    const handleSendComment = async () => {
        if (isSendingComment) return;
        if (!newComment.trim() && !replyTo) return;

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            setShowAuthDialog(true);
            return;
        }

        setIsSendingComment(true);

        let finalContent = newComment;
        let parentId = null;

        if (replyTo) {
            finalContent = `@{${replyTo.authorId}:${replyTo.authorName}} ${newComment}`;
            parentId = replyTo.parentId;
        }

        const { data, error } = await supabase
            .from('comments' as any)
            .insert({
                content: finalContent,
                post_id: post.id,
                user_id: session.user.id,
                parent_id: parentId
            })
            .select(`
                *,
                profiles ( username, full_name, avatar_url )
            `)
            .single();

        if (!error && data) {
            setComments(prev => [...prev, data as any]);
            setCommentCount(prev => prev + 1);


            // Notifications are handled by the DB trigger (handle_new_comment)

            setNewComment("");
            setReplyTo(null);
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

    // Helper to parser content for display (simple version)
    const renderCommentContent = (content: string) => {
        const mentionRegex = /@\{([^:]+):([^}]+)\}/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = mentionRegex.exec(content)) !== null) {
            if (match.index > lastIndex) {
                parts.push(content.slice(lastIndex, match.index));
            }
            // match[1] is UUID, match[2] is Name
            parts.push(
                <span key={match.index} className="text-[var(--primary)] font-bold bg-[var(--primary)]/10 px-1 rounded mx-0.5">
                    @{match[2]}
                </span>
            );
            lastIndex = mentionRegex.lastIndex;
        }
        if (lastIndex < content.length) {
            parts.push(content.slice(lastIndex));
        }
        return parts.length > 0 ? parts : content;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.nativeEvent.isComposing) return; // Prevent double firing on IME (Korean, etc)
        if (e.key === 'Enter') {
            handleSendComment();
        } else if (e.key === 'Backspace' && newComment === '' && replyTo) {
            setReplyTo(null);
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
                            <div className="flex gap-2 items-center bg-[var(--background)] border border-[var(--border)] rounded-full px-3 py-2 transition-colors focus-within:border-[var(--primary)] min-h-[46px]">
                                {replyTo && (
                                    <span className="flex items-center gap-1 text-xs font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-full shrink-0 animate-in fade-in slide-in-from-left-2 whitespace-nowrap">
                                        @{replyTo.authorName}에게 답글
                                        <button onClick={() => setReplyTo(null)} className="hover:text-red-500 ml-1 p-0.5">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    </span>
                                )}
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder={replyTo ? "" : t("community.write_comment")}
                                    className="flex-1 bg-transparent text-sm outline-none min-w-[50px]"
                                    onKeyDown={handleKeyDown}
                                />
                                <button
                                    onClick={handleSendComment}
                                    disabled={(!newComment.trim() && !replyTo) || isSendingComment}
                                    className="p-1.5 bg-[var(--primary)] text-white rounded-full disabled:opacity-50 ml-auto shrink-0 flex items-center justify-center h-8 w-8"
                                >
                                    {isSendingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
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
                                <div
                                    className="space-y-4 max-h-80 overflow-y-auto pr-1 scrollbar-thin"
                                    onClick={() => setCommentMenuId(null)}
                                >
                                    {comments.filter((c: any) => !c.parent_id).map((comment) => (
                                        <div key={comment.id} className="space-y-2">
                                            {/* Root Comment */}
                                            <CommentItem
                                                comment={comment}
                                                isReply={false}
                                                currentUserId={currentUserId}
                                                activePressId={activePressId}
                                                commentMenuId={commentMenuId}
                                                onReply={handleReply}
                                                onPressStart={startPress}
                                                onPressEnd={cancelPress}
                                                onContextMenu={(e: any) => {
                                                    if (currentUserId === comment.user_id) {
                                                        e.preventDefault();
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setMenuPosition({ top: rect.top, right: window.innerWidth - rect.right + 8 });
                                                        setCommentMenuId(comment.id);
                                                    }
                                                }}
                                                locale={locale}
                                                t={t}
                                            />

                                            {/* Replies */}
                                            {comments
                                                .filter((c: any) => c.parent_id === comment.id)
                                                .map((reply) => (
                                                    <CommentItem
                                                        key={reply.id}
                                                        comment={reply}
                                                        isReply={true}
                                                        currentUserId={currentUserId}
                                                        activePressId={activePressId}
                                                        commentMenuId={commentMenuId}
                                                        onReply={handleReply}
                                                        onPressStart={startPress}
                                                        onPressEnd={cancelPress}
                                                        onContextMenu={(e: any) => {
                                                            if (currentUserId === reply.user_id) {
                                                                e.preventDefault();
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setMenuPosition({ top: rect.top, right: window.innerWidth - rect.right + 8 });
                                                                setCommentMenuId(reply.id);
                                                            }
                                                        }}
                                                        locale={locale}
                                                        t={t}
                                                    />
                                                ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Comment Action Menu - Outside layout */}
            <AnimatePresence>
                {commentMenuId && menuPosition && (
                    <>
                        <div
                            className="fixed inset-0 z-[100]"
                            onClick={() => {
                                setCommentMenuId(null);
                                setMenuPosition(null);
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, x: 10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9, x: 10 }}
                            style={{ top: menuPosition.top, right: menuPosition.right }}
                            className="fixed z-[101] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden"
                        >
                            <button
                                onClick={() => {
                                    handleDeleteCommentClick(commentMenuId);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 w-full transition-colors text-xs font-bold whitespace-nowrap"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>{t("common.delete")}</span>
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {
                showAuthDialog && (
                    <div className="fixed inset-0 z-[110]">
                        <AuthDialog onClose={() => setShowAuthDialog(false)} />
                    </div>
                )
            }

            <ConfirmDialog
                isOpen={!!commentToDelete}
                onClose={() => setCommentToDelete(null)}
                onConfirm={executeDeleteComment}
                title={t("common.delete")}
                description="댓글을 삭제하시겠습니까?"
                confirmText={t("common.delete")}
                cancelText={t("common.cancel")}
                variant="danger"
            />
        </div>
    );
}

function CommentItem({
    comment,
    isReply,
    currentUserId,
    activePressId,
    commentMenuId,
    onReply,
    onPressStart,
    onPressEnd,
    onContextMenu,
    locale,
    t
}: any) {
    // Helper to parser content for display (simple version)
    const renderCommentContent = (content: string) => {
        const mentionRegex = /@\{([^:]+):([^}]+)\}/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = mentionRegex.exec(content)) !== null) {
            if (match.index > lastIndex) {
                parts.push(content.slice(lastIndex, match.index));
            }
            // match[1] is UUID, match[2] is Name
            parts.push(
                <span key={match.index} className="text-[var(--primary)] font-bold bg-[var(--primary)]/10 px-1 rounded mx-0.5">
                    @{match[2]}
                </span>
            );
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < content.length) {
            parts.push(content.slice(lastIndex));
        }
        return parts.length > 0 ? parts : content;
    };

    return (
        <div
            className={cn(
                "flex gap-2.5 group py-1 px-1.5 rounded-xl transition-colors",
                isReply && "ml-8 bg-[var(--secondary)]/30", // Indentation for replies
                commentMenuId === comment.id && "bg-[var(--primary)]/10",
                activePressId === comment.id && "bg-[var(--secondary)]"
            )}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={onContextMenu}
            onTouchStart={(e) => onPressStart(comment.id, currentUserId === comment.user_id, e)}
            onTouchEnd={onPressEnd}
            onTouchMove={onPressEnd}
            onMouseDown={(e) => onPressStart(comment.id, currentUserId === comment.user_id, e)}
            onMouseUp={onPressEnd}
            onMouseLeave={onPressEnd}
        >
            {isReply && (
                <div className="text-[var(--muted)] text-xs pt-1 select-none">
                    └
                </div>
            )}
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
                    <button
                        onClick={() => onReply(comment.id, comment.profiles?.full_name || "Unknown", comment.user_id, comment.parent_id)}
                        className="text-[10px] text-[var(--primary)] font-medium transition-opacity ml-1 hover:underline"
                    >
                        {t("community.reply")}
                    </button>
                </div>
                <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-[var(--foreground)] leading-snug flex-1 break-words whitespace-pre-wrap">
                        {renderCommentContent(comment.content)}
                    </p>
                </div>
            </div>
        </div>
    );
}
