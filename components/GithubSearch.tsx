'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import type { GithubResponse } from '@/types/github';

type SortOption = 'stars' | 'name' | 'updated';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function GithubSearch() {
  const [username, setUsername] = useState('');
  const [data, setData] = useState<GithubResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [visibleCount, setVisibleCount] = useState(10);
  const [expandedRepoId, setExpandedRepoId] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentGithubSearches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch {
      localStorage.removeItem('recentGithubSearches');
    }
  }, []);

  const saveRecentSearch = (search: string) => {
    setRecentSearches(prev => {
      const updated = [search, ...prev.filter(s => s !== search)].slice(0, 5);
      localStorage.setItem('recentGithubSearches', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearch = async (targetUsername: string) => {
    const cleanUsername = targetUsername.trim();
    if (!cleanUsername) {
      setError('Please enter a GitHub username');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setVisibleCount(10);
    setExpandedRepoId(null);
    setUsername(cleanUsername);

    try {
      const res = await fetch(`/api/github?username=${encodeURIComponent(cleanUsername)}`);
      if (!res.ok) {
        const result = await res.json().catch(() => null);
        throw new Error(result?.error || 'Request failed');
      }

      const result = await res.json();
      setData(result);
      saveRecentSearch(result.profile.login);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const sortedRepos = useMemo(() => {
    if (!data?.repos) return [];
    return [...data.repos].sort((a, b) => {
      if (sortBy === 'stars') return b.stargazers_count - a.stargazers_count;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [data?.repos, sortBy]);

  const pieData = useMemo(() => {
    if (!data?.languages) return [];
    return Object.entries(data.languages)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [data?.languages]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(username); }} className="flex gap-2">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter GitHub username..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        
        {recentSearches.length > 0 && (
          <div className="flex gap-2 items-center text-sm text-gray-600">
            <span>Recent:</span>
            {recentSearches.map(search => (
              <button 
                key={search} 
                onClick={() => handleSearch(search)}
                className="hover:text-blue-600 hover:underline"
              >
                {search}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">{error}</div>}
      {loading && <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}

      {data && !loading && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Profile Section */}
          <div className="flex flex-col md:flex-row gap-6 p-6 bg-white rounded-lg border border-gray-100 relative">
            <Image src={data.profile.avatar_url} alt={`${data.profile.login} avatar`} width={96} height={96} className="rounded-full border border-gray-200" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{data.profile.name || data.profile.login}</h2>
              <a href={`https://github.com/${data.profile.login}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">@{data.profile.login}</a>
              {data.profile.bio && <p className="text-gray-600 mt-2">{data.profile.bio}</p>}
              <div className="flex gap-4 mt-4 text-sm text-gray-600 flex-wrap">
                <span><strong>{data.profile.followers}</strong> Followers</span>
                <span><strong>{data.profile.following}</strong> Following</span>
                <span><strong>{data.profile.public_repos}</strong> Repositories</span>
              </div>
            </div>
            {data.cached && <span className="absolute top-4 right-4 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Cached</span>}
          </div>

          {/* Languages Chart */}
          {pieData.length > 0 && (
            <div className="p-6 bg-white rounded-lg border border-gray-100 h-64 flex flex-col">
              <h3 className="font-semibold mb-2">Language Distribution</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Repositories */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Public Repositories ({data.repos.length})</h3>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm">
                <option value="updated">Recently Updated</option>
                <option value="stars">Most Stars</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {sortedRepos.slice(0, visibleCount).map((repo) => {
                const isExpanded = expandedRepoId === repo.id;
                return (
                  <article
                    key={repo.id}
                    className="flex flex-col text-left p-4 bg-white rounded-lg border border-gray-100 hover:border-blue-300 transition-colors w-full"
                  >
                    <div className="flex justify-between items-start w-full gap-2">
                      <a 
                        href={repo.html_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-semibold text-blue-600 hover:underline truncate"
                      >
                        {repo.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => setExpandedRepoId(isExpanded ? null : repo.id)}
                        aria-expanded={isExpanded}
                        className="text-gray-500 hover:text-gray-800 text-xs px-2 py-1 bg-gray-50 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                      >
                        {isExpanded ? 'Collapse ▲' : 'Expand ▼'}
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2 min-h-[2.5rem]">
                      {repo.description || 'No description.'}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                          {repo.language}
                        </span>
                      )}
                      <span>⭐ {repo.stargazers_count}</span>
                      <span>Updated {formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true })}</span>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 text-xs w-full text-gray-600">
                        <span><strong>Issues:</strong> {repo.open_issues_count}</span>
                        <span><strong>Branch:</strong> {repo.default_branch}</span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            {visibleCount < sortedRepos.length && (
              <div className="flex justify-center mt-6">
                <button onClick={() => setVisibleCount(prev => prev + 10)} className="px-6 py-2 border border-gray-300 rounded-md">Load More</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}