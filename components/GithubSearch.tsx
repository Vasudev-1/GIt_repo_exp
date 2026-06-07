'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import type { GithubResponse } from '@/types/github';

type SortOption = 'stars' | 'name' | 'updated';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function GithubSearch() {
  // Local state
  const [username, setUsername] = useState('');
  const [data, setData] = useState<GithubResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [visibleCount, setVisibleCount] = useState(6);
  const [expandedRepoId, setExpandedRepoId] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load history
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentGithubSearches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {
      localStorage.removeItem('recentGithubSearches');
    }
  }, []);

  // Save history
  const saveRecentSearch = (search: string) => {
    setRecentSearches(prev => {
      const updated = [search, ...prev.filter(s => s !== search)].slice(0, 5);
      localStorage.setItem('recentGithubSearches', JSON.stringify(updated));
      return updated;
    });
  };

  // Debounce typing
  useEffect(() => {
    const cleanName = username.trim();
    
    if (!cleanName || cleanName.length < 2) return;
    if (data?.profile.login.toLowerCase() === cleanName.toLowerCase()) return;

    const timeoutId = setTimeout(() => {
      handleSearch(cleanName);
    }, 600); 

    return () => clearTimeout(timeoutId);
  }, [username]);

  // Fetch API
  const handleSearch = async (targetUsername: string) => {
    const cleanUsername = targetUsername.trim();
    if (!cleanUsername) {
      setError('Please enter a valid GitHub username.');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setVisibleCount(6);
    setExpandedRepoId(null);
    setUsername(cleanUsername);

    try {
      const res = await fetch(`/api/github?username=${encodeURIComponent(cleanUsername)}`);
      if (!res.ok) {
        const result = await res.json().catch(() => null);
        throw new Error(result?.error || 'Request failed. Please try again.');
      }

      const result = await res.json();
      setData(result);
      saveRecentSearch(result.profile.login);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Sort repos
  const sortedRepos = useMemo(() => {
    if (!data?.repos) return [];
    return [...data.repos].sort((a, b) => {
      if (sortBy === 'stars') return b.stargazers_count - a.stargazers_count;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [data?.repos, sortBy]);

  // Chart data
  const pieData = useMemo(() => {
    if (!data?.languages) return [];
    return Object.entries(data.languages)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [data?.languages]);

  // Render UI
  return (
    <div className="w-full space-y-8">
      
      {/* Search Bar */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(username); }} className="relative flex gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Search GitHub username (e.g., torvalds)"
              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-blue-600/20"
          >
            {loading ? (
              <><svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Searching...</>
            ) : 'Search'}
          </button>
        </form>
        
        {recentSearches.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center mt-4 text-sm text-gray-500">
            <span className="font-medium mr-1">Recent:</span>
            {recentSearches.map(search => (
              <button 
                key={search} 
                onClick={() => handleSearch(search)}
                className="px-3 py-1 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 rounded-full transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Data display */}
      {data && !loading && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Profile */}
            <div className="lg:col-span-2 p-8 bg-white rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-white rounded-bl-full -z-10"></div>
              
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <Image src={data.profile.avatar_url} alt={`${data.profile.login} avatar`} width={120} height={120} className="rounded-2xl border-4 border-white shadow-md bg-white shrink-0" />
                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">{data.profile.name || data.profile.login}</h2>
                    <a href={`https://github.com/${data.profile.login}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline text-lg font-medium">@{data.profile.login}</a>
                  </div>
                  {data.profile.bio && <p className="text-gray-600 leading-relaxed max-w-xl">{data.profile.bio}</p>}
                  
                  <div className="flex flex-wrap gap-3 pt-2">
                    <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 flex flex-col items-center min-w-[100px]">
                      <span className="text-2xl font-bold text-gray-900">{data.profile.followers}</span>
                      <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Followers</span>
                    </div>
                    <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 flex flex-col items-center min-w-[100px]">
                      <span className="text-2xl font-bold text-gray-900">{data.profile.following}</span>
                      <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Following</span>
                    </div>
                    <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 flex flex-col items-center min-w-[100px]">
                      <span className="text-2xl font-bold text-gray-900">{data.profile.public_repos}</span>
                      <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Repositories</span>
                    </div>
                  </div>
                </div>
              </div>
              {data.cached && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  Served from Cache
                </div>
              )}
            </div>

            {/* Languages */}
            {pieData.length > 0 && (
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full min-h-[300px]">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Top Languages</h3>
                <div className="flex-1 w-full min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3}>
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="stroke-white stroke-2 hover:opacity-80 transition-opacity" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#111827', fontWeight: 500 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Repositories */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                Public Repositories
              </h3>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label htmlFor="sort" className="text-sm font-medium text-gray-500">Sort by:</label>
                <select 
                  id="sort"
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as SortOption)} 
                  className="flex-1 sm:w-48 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="updated">Recently Updated</option>
                  <option value="stars">Most Stars</option>
                  <option value="name">Alphabetical (A-Z)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {sortedRepos.slice(0, visibleCount).map((repo) => {
                const isExpanded = expandedRepoId === repo.id;
                return (
                  <article
                    key={repo.id}
                    className="group flex flex-col p-5 bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 w-full"
                  >
                    <div className="flex justify-between items-start w-full gap-3">
                      <a 
                        href={repo.html_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-bold text-lg text-blue-600 hover:text-blue-800 hover:underline truncate"
                        title={repo.name}
                      >
                        {repo.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => setExpandedRepoId(isExpanded ? null : repo.id)}
                        aria-expanded={isExpanded}
                        className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                        aria-label={isExpanded ? 'Collapse repository details' : 'Expand repository details'}
                      >
                        <svg className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2 min-h-[2.5rem] leading-relaxed">
                      {repo.description || <span className="italic text-gray-400">No description provided.</span>}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm font-medium text-gray-600">
                      {repo.language && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-md text-xs">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          {repo.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1 hover:text-yellow-600 transition-colors">
                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        {repo.stargazers_count}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        Updated {formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true })}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6 text-sm w-full text-gray-600 animate-in slide-in-from-top-2 fade-in duration-200">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                          <strong>{repo.open_issues_count}</strong> Issues
                        </span>
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                          Branch: <span className="font-mono bg-gray-100 px-1.5 rounded">{repo.default_branch}</span>
                        </span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            
            {visibleCount < sortedRepos.length && (
              <div className="flex justify-center mt-8 pt-4">
                <button 
                  onClick={() => setVisibleCount(prev => prev + 6)} 
                  className="px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:border-blue-300 hover:text-blue-700 transition-colors shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-50"
                >
                  Load More Repositories
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}