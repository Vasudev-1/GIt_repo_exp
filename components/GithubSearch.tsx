'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import type { GithubResponse } from '@/types/github';

type SortOption = 'stars' | 'name' | 'updated';
const COLORS = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#f4f4f5'];
const DARK_COLORS = ['#f4f4f5', '#d4d4d8', '#a1a1aa', '#71717a', '#3f3f46', '#18181b'];

export default function GithubSearch() {
  // Local state
  const [username, setUsername] = useState('');
  const [data, setData] = useState<GithubResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [visibleCount, setVisibleCount] = useState(6);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Init theme & history
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    
    const savedHistory = localStorage.getItem('github-recent-searches');
    if (savedHistory) {
      try { setRecentSearches(JSON.parse(savedHistory)); } catch (e) {}
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Live search
  useEffect(() => {
    const cleanName = username.trim();
    if (!cleanName) return;
    if (data?.profile?.login?.toLowerCase() === cleanName.toLowerCase()) return;

    const timeoutId = setTimeout(() => {
      handleSearch(cleanName);
    }, 300); 

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Fetch API
  const handleSearch = async (targetUsername: string) => {
    const cleanUsername = targetUsername.trim();
    if (!cleanUsername) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/github?username=${encodeURIComponent(cleanUsername)}`);
      if (!res.ok) {
        const result = await res.json().catch(() => null);
        throw new Error(result?.error || 'Request failed.');
      }
      const newData = await res.json();
      setData(newData);
      setVisibleCount(6);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Smart history save (1.5s reading timer)
  useEffect(() => {
    const viewedUser = data?.profile?.login;
    if (!viewedUser) return;

    const historyTimer = setTimeout(() => {
      setRecentSearches(prev => {
        // Prevent duplicates from moving to the top if already there
        if (prev[0]?.toLowerCase() === viewedUser.toLowerCase()) return prev;
        
        const updated = [viewedUser, ...prev.filter(name => name.toLowerCase() !== viewedUser.toLowerCase())].slice(0, 5);
        localStorage.setItem('github-recent-searches', JSON.stringify(updated));
        return updated;
      });
    }, 1500); 

    return () => clearTimeout(historyTimer);
  }, [data?.profile?.login]);

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
    <div className="w-full min-h-screen text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-sans">
      
      {/* Navbar */}
      <div className="w-full max-w-5xl mx-auto p-4 flex justify-end">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-zinc-500"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? (
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path></svg>
          ) : (
            <svg className="w-5 h-5 text-zinc-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
          )}
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-20 pt-16">
        
        {/* Hero Text */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium">
            Paste a GitHub username to explore their repositories, languages, and contribution stats.
          </p>
        </div>

        {/* Search form */}
        <div className="max-w-xl mx-auto">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSearch(username); }} 
            className="relative flex items-center p-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-full shadow-sm hover:shadow-md transition-shadow"
          >
            <svg className="w-5 h-5 ml-4 text-zinc-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Search GitHub username..."
              className="flex-1 px-4 py-2.5 bg-transparent border-none text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-0"
            />
            <button
              type="submit"
              disabled={loading}
              className="p-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center min-w-[44px]"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              )}
            </button>
          </form>

          {/* Dynamic Recent History */}
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap justify-center items-center gap-3 mt-6 animate-in fade-in duration-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Recent:</span>
              {recentSearches.map(name => (
                <button 
                  key={name}
                  onClick={() => { setUsername(name); handleSearch(name); }}
                  className="px-3 py-1 text-sm font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-2xl text-center font-medium max-w-xl mx-auto">
            {error}
          </div>
        )}

        {/* Results UI */}
        {data && (
          <div className={`mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8 border-t border-zinc-200 dark:border-zinc-800 ${loading ? 'opacity-50' : 'opacity-100'} transition-opacity`}>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile */}
              <div className="lg:col-span-2 p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <Image src={data.profile.avatar_url} alt="avatar" width={100} height={100} className="rounded-full shadow-md" />
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold">{data.profile.name || data.profile.login}</h2>
                    <a href={`https://github.com/${data.profile.login}`} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">@{data.profile.login}</a>
                    {data.profile.bio && <p className="text-zinc-600 dark:text-zinc-400 mt-2">{data.profile.bio}</p>}
                    
                    <div className="flex gap-6 pt-4">
                      <div><strong className="text-xl">{data.profile.followers}</strong> <span className="text-sm text-zinc-500">Followers</span></div>
                      <div><strong className="text-xl">{data.profile.following}</strong> <span className="text-sm text-zinc-500">Following</span></div>
                      <div><strong className="text-xl">{data.profile.public_repos}</strong> <span className="text-sm text-zinc-500">Repos</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart */}
              {pieData.length > 0 && (
                <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center min-h-[250px]">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-2">Languages</h3>
                  <div className="w-full h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} stroke="none">
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={isDarkMode ? DARK_COLORS[index % DARK_COLORS.length] : COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? '#27272a' : '#ffffff', 
                            borderRadius: '12px', 
                            border: isDarkMode ? '1px solid #3f3f46' : '1px solid #e4e4e7',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }} 
                          itemStyle={{ color: isDarkMode ? '#f4f4f5' : '#18181b', fontWeight: 500 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Headers */}
            <div className="flex justify-between items-center pt-6">
              <h3 className="text-2xl font-bold">Repositories</h3>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortOption)} 
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5"
              >
                <option value="updated">Recently Updated</option>
                <option value="stars">Most Stars</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>

            {/* Repos grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {sortedRepos.slice(0, visibleCount).map((repo) => (
                <a
                  key={repo.id}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-400 transition-colors"
                >
                  <h4 className="font-bold text-lg group-hover:underline truncate">{repo.name}</h4>
                  <p className="text-sm text-zinc-500 mt-2 line-clamp-2 min-h-[2.5rem]">{repo.description || 'No description provided.'}</p>
                  
                  <div className="flex items-center gap-4 mt-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {repo.language && <span>{repo.language}</span>}
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                      {repo.stargazers_count}
                    </span>
                    <span className="ml-auto text-zinc-400 dark:text-zinc-500">
                      {formatDistanceToNow(new Date(repo.updated_at))} ago
                    </span>
                  </div>
                </a>
              ))}
            </div>

            {visibleCount < sortedRepos.length && (
              <div className="flex justify-center mt-8">
                <button 
                  onClick={() => setVisibleCount(prev => prev + 6)} 
                  className="px-6 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}