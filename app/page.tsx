import GithubSearch from '@/components/GithubSearch';

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">GitHub Explorer</h1>
          <p className="text-gray-500 mt-2">Search profiles and analyze repositories</p>
        </header>
        <GithubSearch />
      </div>
    </main>
  );
}