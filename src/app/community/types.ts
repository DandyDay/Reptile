
export interface Post {
    id: string;
    content: string;
    image_urls: string[];
    created_at: string;
    likes_count: number;
    user_id: string;
    profiles: {
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
    isLiked?: boolean;
}

export interface Comment {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: {
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
}
