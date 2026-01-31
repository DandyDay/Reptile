export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
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
            posts: {
                Row: {
                    content: string
                    created_at: string
                    id: string
                    image_url: string | null
                    reptile_id: string | null
                    user_id: string
                }
                Insert: {
                    content: string
                    created_at?: string
                    id?: string
                    image_url?: string | null
                    reptile_id?: string | null
                    user_id: string
                }
                Update: {
                    content?: string
                    created_at?: string
                    id?: string
                    image_url?: string | null
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
                }
                Insert: {
                    avatar_url?: string | null
                    bio?: string | null
                    created_at?: string
                    full_name?: string | null
                    id: string
                    updated_at?: string | null
                    username?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    bio?: string | null
                    created_at?: string
                    full_name?: string | null
                    id?: string
                    updated_at?: string | null
                    username?: string | null
                }
                Relationships: []
            }
            reptiles: {
                Row: {
                    birth_date: string | null
                    created_at: string
                    id: string
                    name: string
                    photo_url: string | null
                    species: string | null
                    user_id: string
                }
                Insert: {
                    birth_date?: string | null
                    created_at?: string
                    id?: string
                    name: string
                    photo_url?: string | null
                    species?: string | null
                    user_id: string
                }
                Update: {
                    birth_date?: string | null
                    created_at?: string
                    id?: string
                    name?: string
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
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
