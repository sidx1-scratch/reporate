// lib/dossier.js
// Pulls together everything about a repo worth making fun of: metadata,
// language breakdown, the README, and the latest commit message.

const GITHUB_API = 'https://api.github.com';

/**
 * Accepts a full GitHub URL, a "owner/repo" shorthand, or a bare repo name
 * with an implied owner, and returns { owner, repo }.
 */
export function parseRepoInput(input) {
  const trimmed = input.trim().replace(/\.git$/, '').replace(/\/$/, '');

  // Full URL: https://github.com/owner/repo(/...)
  const urlMatch = trimmed.match(/github\.com\/([^/\s]+)\/([^/\s]+)/i);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }

  // Shorthand: owner/repo
  const shortMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  return null;
}

async function githubFetch(path, accept) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      'User-Agent': 'repocart-app',
      Accept: accept || 'application/vnd.github+json',
    },
  });
  return res;
}

/**
 * Builds a plain-text dossier describing the repo: stats, language mix,
 * README content (truncated), and the latest commit message.
 * Throws a descriptive Error if the repo can't be found or read.
 */
export async function buildDossier(input) {
  const parsed = parseRepoInput(input);
  if (!parsed) {
    throw new Error(
      'Could not parse that as a GitHub repo. Try a full URL or "owner/repo".'
    );
  }
  const { owner, repo } = parsed;

  const repoRes = await githubFetch(`/repos/${owner}/${repo}`);
  if (repoRes.status === 404) {
    throw new Error(`Repo "${owner}/${repo}" doesn't exist or is private.`);
  }
  if (repoRes.status === 403) {
    throw new Error('GitHub API rate limit hit. Try again in a few minutes.');
  }
  if (!repoRes.ok) {
    throw new Error(`GitHub API error (${repoRes.status}) fetching repo metadata.`);
  }
  const repoData = await repoRes.json();

  let languages = {};
  try {
    const langRes = await githubFetch(`/repos/${owner}/${repo}/languages`);
    if (langRes.ok) languages = await langRes.json();
  } catch {
    // languages are nice-to-have, not essential
  }

  let readmeText = '(no README found)';
  try {
    const readmeRes = await githubFetch(
      `/repos/${owner}/${repo}/readme`,
      'application/vnd.github.raw'
    );
    if (readmeRes.ok) {
      const raw = await readmeRes.text();
      readmeText = raw.slice(0, 6000);
    }
  } catch {
    // missing README is itself a fun fact, not a fatal error
  }

  let latestCommitMessage = '(no commits found)';
  try {
    const commitsRes = await githubFetch(`/repos/${owner}/${repo}/commits?per_page=1`);
    if (commitsRes.ok) {
      const commits = await commitsRes.json();
      if (Array.isArray(commits) && commits[0]?.commit?.message) {
        latestCommitMessage = commits[0].commit.message.split('\n')[0];
      }
    }
  } catch {
    // optional
  }

  const languageEntries = Object.entries(languages);
  const languageTotal = languageEntries.reduce((sum, [, bytes]) => sum + bytes, 0);
  const languageBreakdown = languageEntries
    .map(([name, bytes]) => ({
      name,
      percent: languageTotal ? Math.round((bytes / languageTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.percent - a.percent);

  const dossierText = [
    `Repo: ${repoData.full_name}`,
    `Description: ${repoData.description || '(none provided)'}`,
    `Stars: ${repoData.stargazers_count} | Forks: ${repoData.forks_count} | Open issues: ${repoData.open_issues_count}`,
    `Primary language: ${repoData.language || 'unknown'}`,
    `Language breakdown: ${languageBreakdown
      .map((l) => `${l.name} ${l.percent}%`)
      .join(', ') || 'unknown'}`,
    `License: ${repoData.license?.name || 'none specified'}`,
    `Created: ${repoData.created_at} | Last pushed: ${repoData.pushed_at}`,
    `Archived: ${repoData.archived ? 'yes' : 'no'}`,
    `Latest commit message: "${latestCommitMessage}"`,
    `Topics: ${(repoData.topics || []).join(', ') || '(none)'}`,
    '',
    'README (truncated):',
    readmeText,
  ].join('\n');

  return {
    owner,
    repo,
    fullName: repoData.full_name,
    description: repoData.description,
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    openIssues: repoData.open_issues_count,
    license: repoData.license?.name || null,
    languageBreakdown,
    dossierText,
  };
}
