/**
 * resumeView.ts — which résumé view a URL asks for.
 *
 * Kept out of the component so the choice can be read and written without
 * mounting anything, and so `ResumePage.tsx` exports only a component (the
 * react-refresh rule the project lints for).
 *
 * The view lives in the query string rather than in state alone: it survives a
 * reload, can be bookmarked, and can be sent to someone as the view you meant
 * them to see.
 */
export type ResumeView = 'designed' | 'ats';

export const VIEW_PARAM = 'view';

export function viewFromSearch(search: string): ResumeView {
  return new URLSearchParams(search).get(VIEW_PARAM) === 'ats' ? 'ats' : 'designed';
}

/** The query string for a view — empty for the default, so the plain URL stays plain. */
export function searchForView(view: ResumeView): string {
  return view === 'ats' ? `?${VIEW_PARAM}=ats` : '';
}
