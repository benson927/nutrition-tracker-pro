import React, { useState, useEffect, useCallback } from 'react';
import { getPosts, createPost, createComment, PostResponse } from './api';

// ── TypeScript 介面定義 ────────────────────────────────

interface ForumProps {
  userId: number | null;
}

const Forum: React.FC<ForumProps> = ({ userId }) => {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});
  const [activeComments, setActiveComments] = useState<{ [key: number]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── 資料載入 ──────────────────────────────────────

  const loadPosts = useCallback(async () => {
    try {
      const data = await getPosts();
      setPosts(data);
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // ── 動作處理 ──────────────────────────────────────

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createPost(newPostContent, userId || 1);
      setNewPostContent('');
      await loadPosts();
    } catch (err) {
      alert("無法發布貼文，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateComment = async (postId: number) => {
    const content = commentInputs[postId];
    if (!content?.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createComment(postId, content, userId || 1);
      setCommentInputs({ ...commentInputs, [postId]: '' });
      await loadPosts();
    } catch (err) {
      alert("無法新增留言。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleComments = (postId: number) => {
    setActiveComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  // ── 渲染工具 ──────────────────────────────────────

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /** 根據字串產生固定的雜湊顏色 (Hash Color) */
  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    // 使用較高飽和度與適中亮度，確保在深色主題下清晰
    return `hsl(${h}, 65%, 45%)`;
  };

  /** 取得名字的第一個字元並轉大寫 */
  const getInitials = (name: string) => {
    return (name.charAt(0) || '?').toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="forum-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: 'var(--text-secondary)', animation: 'pulse 1.5s infinite' }}>載入討論中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      {/* ── 發文區 ── */}
      <div className="glass-panel group transition-all duration-500 hover:border-white/20">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <span className="text-2xl">✍️</span> Share your progress
        </h3>
        <form onSubmit={handleCreatePost} className="space-y-4">
          <textarea 
            placeholder="今天吃了什麼好料？或者有什麼減重困惑嗎？" 
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 min-h-[140px] text-white text-lg focus:ring-2 focus:ring-blue-500/30 focus:bg-white/10 transition-all outline-none placeholder:text-white/20"
          />
          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={isSubmitting || !newPostContent.trim()}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full font-bold text-white shadow-xl hover-glow transition-all active:scale-95 disabled:opacity-40 disabled:hover-glow-none"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  發布中...
                </span>
              ) : '發布貼文'}
            </button>
          </div>
        </form>
      </div>

      {/* ── 貼文列表 ── */}
      <div className="space-y-8">
        {posts.length === 0 ? (
          <div className="glass-panel text-center py-20 opacity-60">
            <p className="text-6xl mb-6">🍂</p>
            <p className="text-xl text-gray-400 font-light">目前還沒有任何討論。成為第一個分享的人吧！</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="glass-panel p-8 group transition-all duration-300 hover:translate-y-[-2px]">
              {/* 貼文頭部 */}
              <div className="flex items-center mb-6">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg border border-white/20 transition-transform group-hover:scale-110"
                  style={{ background: stringToColor(post.username) }}
                >
                  {getInitials(post.username)}
                </div>
                <div className="ml-4 flex flex-col">
                  <span className="text-xl font-bold text-white tracking-wide">{post.username}</span>
                  <span className="text-sm text-gray-400 font-medium">{formatDateTime(post.created_at)}</span>
                </div>
              </div>
              
              {/* 貼文內容 */}
              <div className="text-gray-200 text-lg leading-relaxed mb-8 whitespace-pre-wrap">
                {post.content}
              </div>

              {/* 貼文操作 */}
              <div className="flex items-center justify-between border-t border-white/10 pt-6">
                <button 
                  onClick={() => toggleComments(post.id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full transition-all ${
                    activeComments[post.id] 
                      ? 'bg-blue-500/20 text-blue-400 font-bold' 
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <span>💬</span>
                  <span>{post.comments.length} 則留言</span>
                </button>
              </div>

              {/* 留言區塊 */}
              {activeComments[post.id] && (
                <div className="mt-8 space-y-6 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {post.comments.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4 italic">尚未有留言，快來搶頭香！</p>
                    )}
                    {post.comments.map(comment => (
                      <div key={comment.id} className="flex gap-4 group/comment">
                        <div 
                          className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white border border-white/10"
                          style={{ background: stringToColor(comment.username) }}
                        >
                          {getInitials(comment.username)}
                        </div>
                        <div className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 transition-colors group-hover/comment:bg-white/[0.05]">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-blue-400 text-sm">{comment.username}</span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest">{formatDateTime(comment.created_at)}</span>
                          </div>
                          <div className="text-gray-300 text-[15px] leading-snug">{comment.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 留言輸入框 */}
                  <div className="flex gap-3 pt-2">
                    <input 
                      type="text" 
                      placeholder="撰寫留言..." 
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateComment(post.id);
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                    />
                    <button 
                      onClick={() => handleCreateComment(post.id)}
                      disabled={isSubmitting || !commentInputs[post.id]?.trim()}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 transition-all rounded-full text-sm font-bold text-white disabled:opacity-40"
                    >
                      傳送
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        .post-card:hover {
          border-color: rgba(59, 130, 246, 0.3) !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
};

export default Forum;
