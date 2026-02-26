export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.1"
    }
    public: {
        Tables: {
            comments: {
                Row: {
                    content: string
                    created_at: string
                    id: string
                    post_id: string
                    user_id: string
                }
                Insert: {
                    content: string
                    created_at?: string
                    id?: string
                    post_id: string
                    user_id: string
                }
                Update: {
                    content?: string
                    created_at?: string
                    id?: string
                    post_id?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "comments_post_id_fkey"
                        columns: ["post_id"]
                        isOneToOne: false
                        referencedRelation: "posts"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "comments_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            food_presets: {
                Row: {
                    created_at: string
                    emoji: string
                    id: string
                    name: string
                    unit: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    emoji: string
                    id?: string
                    name: string
                    unit: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    emoji?: string
                    id?: string
                    name?: string
                    unit?: string
                    user_id?: string
                }
                Relationships: []
            }
            likes: {
                Row: {
                    created_at: string
                    post_id: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    post_id: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    post_id?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "likes_post_id_fkey"
                        columns: ["post_id"]
                        isOneToOne: false
                        referencedRelation: "posts"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "likes_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            logs: {
                Row: {
                    created_at: string
                    date: string
                    details: string | null
                    emoji: string | null
                    id: string
                    note: string | null
                    reptile_id: string
                    type: string
                    user_id: string
                    weight: number | null
                }
                Insert: {
                    created_at?: string
                    date?: string
                    details?: string | null
                    emoji?: string | null
                    id?: string
                    note?: string | null
                    reptile_id: string
                    type: string
                    user_id: string
                    weight?: number | null
                }
                Update: {
                    created_at?: string
                    date?: string
                    details?: string | null
                    emoji?: string | null
                    id?: string
                    note?: string | null
                    reptile_id?: string
                    type?: string
                    user_id?: string
                    weight?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "logs_reptile_id_fkey"
                        columns: ["reptile_id"]
                        isOneToOne: false
                        referencedRelation: "reptiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            posts: {
                Row: {
                    content: string
                    created_at: string
                    id: string
                    image_url: string | null
                    image_urls: Json | null
                    likes_count: number | null
                    reptile_id: string | null
                    user_id: string
                }
                Insert: {
                    content: string
                    created_at?: string
                    id?: string
                    image_url?: string | null
                    image_urls?: Json | null
                    likes_count?: number | null
                    reptile_id?: string | null
                    user_id: string
                }
                Update: {
                    content?: string
                    created_at?: string
                    id?: string
                    image_url?: string | null
                    image_urls?: Json | null
                    likes_count?: number | null
                    reptile_id?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "posts_reptile_id_fkey"
                        columns: ["reptile_id"]
                        isOneToOne: false
                        referencedRelation: "reptiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "posts_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    bio: string | null
                    created_at: string
                    full_name: string | null
                    id: string
                    updated_at: string | null
                    username: string | null
                    total_xp: number
                }
                Insert: {
                    avatar_url?: string | null
                    bio?: string | null
                    created_at?: string
                    full_name?: string | null
                    id: string
                    updated_at?: string | null
                    username?: string | null
                    total_xp?: number
                }
                Update: {
                    avatar_url?: string | null
                    bio?: string | null
                    created_at?: string
                    full_name?: string | null
                    id?: string
                    updated_at?: string | null
                    username?: string | null
                    total_xp?: number
                }
                Relationships: []
            }
            quest_progress: {
                Row: {
                    id: string
                    user_id: string
                    quest_key: string
                    period_key: string
                    progress: number
                    completed: boolean
                    rewarded_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    quest_key: string
                    period_key: string
                    progress?: number
                    completed?: boolean
                    rewarded_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    quest_key?: string
                    period_key?: string
                    progress?: number
                    completed?: boolean
                    rewarded_at?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "quest_progress_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            achievements: {
                Row: {
                    id: string
                    user_id: string
                    achievement_key: string
                    unlocked_at: string
                    xp_awarded: number
                }
                Insert: {
                    id?: string
                    user_id: string
                    achievement_key: string
                    unlocked_at?: string
                    xp_awarded?: number
                }
                Update: {
                    id?: string
                    user_id?: string
                    achievement_key?: string
                    unlocked_at?: string
                    xp_awarded?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "achievements_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            reptile_3d_models: {
                Row: {
                    id: string
                    reptile_id: string
                    user_id: string
                    task_id: string | null
                    status: string
                    glb_url: string | null
                    thumbnail_url: string | null
                    source_image_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    reptile_id: string
                    user_id: string
                    task_id?: string | null
                    status?: string
                    glb_url?: string | null
                    thumbnail_url?: string | null
                    source_image_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    reptile_id?: string
                    user_id?: string
                    task_id?: string | null
                    status?: string
                    glb_url?: string | null
                    thumbnail_url?: string | null
                    source_image_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "reptile_3d_models_reptile_id_fkey"
                        columns: ["reptile_id"]
                        isOneToOne: true
                        referencedRelation: "reptiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "reptile_3d_models_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            reptiles: {
                Row: {
                    birth_date: string | null
                    care_schedules: Json | null
                    color: string | null
                    created_at: string
                    id: string
                    name: string
                    notes: string | null
                    photo_url: string | null
                    species: string | null
                    user_id: string
                }
                Insert: {
                    birth_date?: string | null
                    care_schedules?: Json | null
                    color?: string | null
                    created_at?: string
                    id?: string
                    name: string
                    notes?: string | null
                    photo_url?: string | null
                    species?: string | null
                    user_id: string
                }
                Update: {
                    birth_date?: string | null
                    care_schedules?: Json | null
                    color?: string | null
                    created_at?: string
                    id?: string
                    name?: string
                    notes?: string | null
                    photo_url?: string | null
                    species?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "reptiles_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            themes: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    colors: Json
                    created_at: string
                    likes_count: number
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    colors: Json
                    created_at?: string
                    likes_count?: number
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    colors?: Json
                    created_at?: string
                    likes_count?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "themes_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            theme_likes: {
                Row: {
                    user_id: string
                    theme_id: string
                    created_at: string
                }
                Insert: {
                    user_id: string
                    theme_id: string
                    created_at?: string
                }
                Update: {
                    user_id?: string
                    theme_id?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "theme_likes_theme_id_fkey"
                        columns: ["theme_id"]
                        isOneToOne: false
                        referencedRelation: "themes"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "theme_likes_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            increment_theme_likes: {
                Args: {
                    theme_id: string
                }
                Returns: void
            }
            decrement_theme_likes: {
                Args: {
                    theme_id: string
                }
                Returns: void
            }
            grant_xp: {
                Args: {
                    p_user_id: string
                    p_source: string
                    p_source_key: string
                    p_xp_delta: number
                }
                Returns: number
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
