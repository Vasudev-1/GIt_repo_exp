import { NextResponse } from 'next/server';
import type { CachedData, GithubApiRepo, LanguageStats } from '@/types/github';

const cache = new Map<string, { data: CachedData; timestamp: number }>();
const CACHE_TTL = 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username')?.trim()?.toLowerCase();

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const cached = cache.get(username);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ ...cached.data, cached: true });
  }

  const headers: HeadersInit = process.env.GITHUB_TOKEN 
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } 
    : {};

  const fetchOptions: RequestInit = { headers, cache: 'no-store' };

  try {
    const [profileRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, fetchOptions),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, fetchOptions)
    ]);
    
    if (profileRes.status === 403 && profileRes.headers.get('x-ratelimit-remaining') === '0') {
      return NextResponse.json({ error: 'GitHub API rate limit exceeded.' }, { status: 429 });
    }

    if (profileRes.status === 404) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (!profileRes.ok) {
      throw new Error(`GitHub API error: ${profileRes.statusText}`);
    }

    if (!reposRes.ok) {
      throw new Error(`Failed to fetch repositories: ${reposRes.statusText}`);
    }

    const profileData = await profileRes.json();
    const reposData: GithubApiRepo[] = await reposRes.json();

    const languages: LanguageStats = {};
    const mappedRepos = reposData.map((repo) => {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
      return {
        id: repo.id,
        name: repo.name,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        updated_at: repo.updated_at,
        html_url: repo.html_url,
        open_issues_count: repo.open_issues_count,
        default_branch: repo.default_branch,
      };
    });

    const result: CachedData = {
      profile: {
        login: profileData.login,
        avatar_url: profileData.avatar_url,
        name: profileData.name,
        bio: profileData.bio,
        followers: profileData.followers,
        following: profileData.following,
        public_repos: profileData.public_repos,
      },
      repos: mappedRepos,
      languages,
    };

    cache.set(username, { data: result, timestamp: Date.now() });

    return NextResponse.json({ ...result, cached: false });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}