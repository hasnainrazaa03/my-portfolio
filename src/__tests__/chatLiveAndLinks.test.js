/**
 * chatLiveAndLinks.test.js — the chat handler's two live features, end to end
 * through api/chat with the model mocked:
 *
 *   - a question about recent work gets GitHub data, delimited, in the
 *     visitor's turn — and the system prompt stays byte-identical, because it
 *     is the cached prefix;
 *   - an answer naming a project links to that project's case study.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deriveCaseStudies, deriveChatLinks, CASE_STUDY_TITLES } from '../../api/_lib/sourceLinks';
import { PROJECTS } from '../constants';
import { projectPath } from '../utils/slug';

const runChain = vi.fn();
const recordInteraction = vi.fn().mockResolvedValue(undefined);

vi.mock('../../api/_lib/llm', async (importOriginal) => ({
  ...(await importOriginal()),
  runChain: (...args) => runChain(...args),
}));
vi.mock('../../api/_lib/analyticsLog', () => ({ recordInteraction: (...a) => recordInteraction(...a) }));

function makeRes() {
  const res = { statusCode: 200, headers: {}, body: undefined };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; return res; };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.end = () => res;
  return res;
}

let ipCounter = 0;
function makeReq(body) {
  // A distinct IP per request so the in-memory rate limiter never interferes.
  const ip = `203.0.113.${(ipCounter += 1)}`;
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, origin: 'https://hasnainrazaa.vercel.app' },
    socket: { remoteAddress: ip },
    body,
    on() { return this; },
  };
}

const github = vi.fn(async (url) => {
  const u = new URL(url);
  if (u.pathname.startsWith('/users/')) {
    return Response.json([{ name: 'my-portfolio', pushed_at: new Date().toISOString(), description: 'Site', language: 'TypeScript' }]);
  }
  if (u.pathname.endsWith('/commits')) {
    return Response.json([{ commit: { message: 'feat(naca): interactive lift curve', committer: { date: new Date().toISOString() } } }]);
  }
  return new Response('', { status: 404 });
});

beforeEach(async () => {
  runChain.mockReset().mockResolvedValue({ text: 'Mostly the portfolio this week.', provider: 'anthropic', model: 'm' });
  recordInteraction.mockClear();
  github.mockClear();
  vi.stubGlobal('fetch', github);
  delete process.env.SENTRY_DSN;
  const { clearRecentWorkCache } = await import('../../api/_lib/githubActivity');
  clearRecentWorkCache();
});

describe('POST /api/chat — live GitHub activity', () => {
  it('puts delimited GitHub data ahead of a recent-work question, and links the GitHub section', async () => {
    const { default: handler } = await import('../../api/chat');
    const res = makeRes();
    await handler(makeReq({ message: 'What is he building this week?' }), res);

    expect(res.statusCode).toBe(200);
    const [, turns] = runChain.mock.calls[0];
    const last = turns[turns.length - 1].content;
    expect(last).toMatch(/^<<LIVE_GITHUB>>\n/);
    expect(last).toContain('feat(naca): interactive lift curve');
    expect(last).toMatch(/<<END_LIVE_GITHUB>>\n\n<<USER>>\nWhat is he building this week\?\n<<END_USER>>$/);
    expect(res.body.sources.map((s) => s.id)).toContain('github');

    // Analytics records what the visitor typed, not the block.
    expect(recordInteraction.mock.calls[0][0].question).toBe('What is he building this week?');
  });

  it('leaves other questions alone and never calls GitHub for them', async () => {
    const { default: handler } = await import('../../api/chat');
    await handler(makeReq({ message: 'What is your GPA?' }), makeRes());
    expect(github).not.toHaveBeenCalled();
    const [, turns] = runChain.mock.calls[0];
    expect(turns[turns.length - 1].content).toBe('<<USER>>\nWhat is your GPA?\n<<END_USER>>');
  });

  it('keeps the system prompt byte-identical either way, so it stays cached', async () => {
    const { default: handler } = await import('../../api/chat');
    await handler(makeReq({ message: 'What is your GPA?' }), makeRes());
    await handler(makeReq({ message: 'What are you working on lately?' }), makeRes());
    expect(runChain.mock.calls[0][0]).toBe(runChain.mock.calls[1][0]);
    expect(runChain.mock.calls[0][0]).toContain('<<LIVE_GITHUB>>'); // the rule that explains the block
  });

  it('still answers when GitHub is down, telling the model so', async () => {
    github.mockImplementation(async () => new Response('down', { status: 503 }));
    const { default: handler } = await import('../../api/chat');
    const res = makeRes();
    await handler(makeReq({ message: 'any recent commits?' }), res);
    expect(res.statusCode).toBe(200);
    const [, turns] = runChain.mock.calls[0];
    expect(turns[turns.length - 1].content).toMatch(/could not be reached/);
  });
});

describe('case-study links', () => {
  it('every named title is a real project, and every project has a name', () => {
    const titles = PROJECTS.map((p) => p.title);
    for (const t of CASE_STUDY_TITLES) expect(titles, t).toContain(t);
    for (const t of titles) expect(CASE_STUDY_TITLES, `${t} has no chat link name`).toContain(t);
  });

  it('links a named project to its case study page', () => {
    const [link] = deriveCaseStudies('tell me about vimaan', 'Project Vimaan is my voice copilot for X-Plane.');
    expect(link).toEqual({
      id: 'case-study:project-vimaan',
      label: 'Vimaan case study',
      href: projectPath('Project Vimaan'),
    });
  });

  it('prefers the project the ANSWER is about', () => {
    const [link] = deriveCaseStudies('is it like Vimaan?', 'No — the NACA 4412 study was CFD, and the NACA 4412 wake work was in Fluent.');
    expect(link.href).toBe(projectPath('Numerical Investigation of Vortex Influence on NACA 4412 Airfoil'));
  });

  it('does not treat the suggestions as a mention', () => {
    expect(deriveCaseStudies('gpa?', 'A 4.0 at USC. [Ask about: Vimaan or USC Ledger?]')).toEqual([]);
  });

  it('puts the case study first, then sections, at most three chips', () => {
    const links = deriveChatLinks('what is manzil?', 'Manzil Recipe Vault is a project I built with React and Node; see my GitHub.');
    expect(links[0].id).toBe('case-study:manzil-recipe-vault');
    expect(links.length).toBeLessThanOrEqual(3);
    expect(new Set(links.map((l) => l.id)).size).toBe(links.length);
  });

  it('always includes GitHub for a live answer', () => {
    const links = deriveChatLinks('what are you building this week?', 'Mostly the portfolio.', { live: true });
    expect(links.map((l) => l.id)).toContain('github');
  });
});
