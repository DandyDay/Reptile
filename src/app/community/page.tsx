"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useReptileLogs } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
    Users, MessageSquare, User, Heart,
    MoreHorizontal, Share2, MessageCircle,
    UserPlus, Search, PenLine, LogIn, LogOut, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthDialog } from "@/components/auth-dialog";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";

interface Post {
    id: string;
    content: string;
    image_url?: string;
    created_at: string;
    likes_count: number; // We'll count this manually for now
    user_id: string;
    profiles: {
        username: string;
        full_name: string;
        avatar_url: string;
    } | null;
    my_like?: boolean;
}

export default function CommunityPage() {
    const { t } = useTranslation();
    const { session, visualSettings } = useReptileLogs();
    const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'profile'>('feed');
    const [showAuthDialog, setShowAuthDialog] = useState(false);

    // Feed State
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState("");
    const [isPosting, setIsPosting] = useState(false);

    // Profile State (Supabase)
    const [myProfile, setMyProfile] = useState<any>(null);

    const locale = visualSettings.language === 'ko' ? ko : enUS;

    // Fetch Posts
    const fetchPosts = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles ( username, full_name, avatar_url )
            `)
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Check likes (basic implementation)
            // Ideally we do a join or separate count, but for simplified view:
            setPosts(data as any);
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

        // Subscribe to new posts
        const channel = supabase
            .channel('realtime posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
                fetchPosts(); // Refresh on new post
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) return;
        if (!session) {
            setShowAuthDialog(true);
            return;
        }

        setIsPosting(true);
        const { error } = await supabase.from('posts').insert({
            content: newPostContent,
            user_id: session.user.id
        });

        if (!error) {
            setNewPostContent("");
        } else {
            alert("Failed to post");
        }
        setIsPosting(false);
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

                {/* Tabs */}
                <div className="flex px-2 border-b border-[var(--border)] bg-[var(--background)]/50">
                    {['feed', 'friends', 'profile'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all relative",
                                activeTab === tab ? "text-[var(--primary)]" : "text-[var(--muted)]"
                            )}
                        >
                            {tab === 'feed' && <MessageSquare className="h-4 w-4" />}
                            {tab === 'friends' && <Users className="h-4 w-4" />}
                            {tab === 'profile' && <User className="h-4 w-4" />}
                            <span className="capitalize">{t(`community.${tab}` as any)}</span>
                            {activeTab === tab && (
                                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
                            )}
                        </button>
                    ))}
                </div>
            </header>

            {/* Content */}
            <main className="p-4 space-y-4">
                <AnimatePresence mode="wait">
                    {activeTab === 'feed' && (
                        <motion.div
                            key="feed"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                        >
                            {/* Create Post Input */}
                            <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] flex gap-3">
                                <div className="h-10 w-10 rounded-full bg-slate-500/20 overflow-hidden flex items-center justify-center text-xl shrink-0">
                                    {myProfile?.avatar_url ? (
                                        <img src={myProfile.avatar_url} alt="me" className="h-full w-full object-cover" />
                                    ) : (
                                        "👤"
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    placeholder={session ? t("community.whats_happening") : "Login to post..."}
                                    disabled={!session}
                                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreatePost()}
                                />
                                <button
                                    onClick={handleCreatePost}
                                    disabled={isPosting || !newPostContent.trim()}
                                    className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-bold text-xs uppercase hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50"
                                >
                                    {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                                </button>
                            </div>

                            {/* Feed Items */}
                            {isLoading ? (
                                <div className="py-20 text-center text-[var(--muted)]">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                    <p className="text-xs">Loading feed...</p>
                                </div>
                            ) : posts.length === 0 ? (
                                <div className="py-20 text-center text-[var(--muted)] opacity-50">
                                    <p>No posts yet. Be the first!</p>
                                </div>
                            ) : (
                                posts.map(post => (
                                    <div key={post.id} className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] space-y-3">
                                        <div className="flex items-center justify-between">
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
                                            <button className="text-[var(--muted)] hover:text-[var(--foreground)]">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                                            {post.content}
                                        </p>

                                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                                            <button className="flex items-center gap-1.5 text-[var(--muted)] hover:text-red-500 transition-colors group">
                                                <Heart className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                                <span className="text-xs font-medium">{post.likes_count || 0}</span>
                                            </button>
                                            <button className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--primary)] transition-colors">
                                                <MessageCircle className="h-4 w-4" />
                                                <span className="text-xs font-medium">0</span>
                                            </button>
                                            <button className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                                                <Share2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'friends' && (
                        <motion.div
                            key="friends"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4 text-center py-20"
                        >
                            <Users className="h-12 w-12 mx-auto text-[var(--muted)] mb-4 opacity-50" />
                            <h3 className="text-lg font-bold text-[var(--muted)]">Friends Feature Coming Soon</h3>
                            <p className="text-sm text-[var(--muted)] opacity-70 mb-6">
                                Connect with other reptile lovers!
                            </p>
                        </motion.div>
                    )}

                    {activeTab === 'profile' && (
                        <motion.div
                            key="profile"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-6"
                        >
                            {!session ? (
                                <div className="text-center py-20 space-y-4">
                                    <div className="text-4xl">🔐</div>
                                    <h3 className="font-bold">Login to view profile</h3>
                                    <button
                                        onClick={() => setShowAuthDialog(true)}
                                        className="bg-[var(--primary)] text-white px-6 py-2 rounded-full font-bold"
                                    >
                                        Login / Signup
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-[var(--card)] rounded-[32px] p-6 border border-[var(--border)] text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-[var(--primary)]/20 to-blue-500/20" />
                                    <div className="relative mt-8 mb-4">
                                        <div className="h-24 w-24 mx-auto rounded-full bg-[var(--background)] border-4 border-[var(--card)] flex items-center justify-center text-5xl shadow-lg overflow-hidden">
                                            {myProfile?.avatar_url ? (
                                                <img src={myProfile.avatar_url} className="h-full w-full object-cover" />
                                            ) : "👤"}
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-black">{myProfile?.full_name || "Reptile Lover"}</h2>
                                    <p className="text-sm text-[var(--muted)] mt-1">{myProfile?.bio || "No bio yet."}</p>
                                    <div className="mt-4 text-xs text-[var(--muted)]">{session.user.email}</div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
