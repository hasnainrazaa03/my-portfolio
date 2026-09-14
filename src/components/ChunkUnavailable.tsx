import React from 'react';

/**
 * Shown in place of ONE section whose code could not be fetched — offline
 * before it was cached, or after a deploy replaced the file an open tab asked
 * for. The rest of the page stays up. See utils/lazyWithRecovery.ts.
 */
const ChunkUnavailable = ({ name, offline }: { name: string; offline: boolean }) => (
  <div
    role="status"
    className="mx-auto my-10 max-w-md rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0d1f] p-5 text-center"
  >
    <p className="font-semibold text-slate-900 dark:text-white">
      {offline ? `${name} isn't available offline yet` : `${name} didn't load`}
    </p>
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
      {offline
        ? "It hasn't been saved on this device. Reconnect, then try again."
        : 'The site may have just been updated. Trying again usually fixes it.'}
    </p>
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="mt-3 rounded-lg border border-slate-300 dark:border-white/15 px-3 py-1.5 text-sm font-medium text-slate-800 dark:text-slate-100 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      Try again
    </button>
  </div>
);

export default ChunkUnavailable;
