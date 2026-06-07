export interface LanguageStats {
  [key: string]: number;
}

export interface GithubApiRepo {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  html_url: string;
  open_issues_count: number;
  default_branch: string;
}

export interface GithubProfile {
  login: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  followers: number;
  following: number;
  public_repos: number;
}

export interface CachedData {
  profile: GithubProfile;
  repos: GithubApiRepo[];
  languages: LanguageStats;
}

export interface GithubResponse extends CachedData {
  cached: boolean;
}