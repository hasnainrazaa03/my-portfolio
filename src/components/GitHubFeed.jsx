import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCommit, GitPullRequest, Star, GitBranch, Disc, ExternalLink, Loader2, AlertCircle, Github } from 'lucide-react';
import { PERSONAL_INFO } from '../constants';

const ActivityItem = ({ event, index }) => {
  const timeAgo = (dateString) => {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };

  const getEventInfo = (event) => {
    switch (event.type) {
      case 'PushEvent':
        return {
          icon: GitCommit,
          color: 'text-emerald-400',
          bg: 'bg-emerald-400/10',
          action: `Pushed ${event.payload.commits?.length || 1} commit${event.payload.commits?.length !== 1 ? 's' : ''}`,
          target: event.payload.commits?.[0]?.message || 'No message'
        };
      case 'PullRequestEvent':
        return {
          icon: GitPullRequest,
          color: 'text-purple-400',
          bg: 'bg-purple-400/10',
          action: `${event.payload.action === 'opened' ? 'Opened' : 'Closed'} PR`,
          target: event.payload.pull_request?.title
        };
      case 'WatchEvent':
        return {
          icon: Star,
          color: 'text-amber-400',
          bg: 'bg-amber-400/10',
          action: 'Starred repository',
          target: null
        };
      case 'CreateEvent':
        return {
          icon: GitBranch,
          color: 'text-blue-400',
          bg: 'bg-blue-400/10',
          action: `Created ${event.payload.ref_type}`,
          target: event.payload.ref || event.repo.name
        };
      default:
        return {
          icon: Disc,
          color: 'text-slate-400',
          bg: 'bg-slate-400/10',
          action: 'Performed action',
          target: event.type
        };
    }
  };

  const info = getEventInfo(event);
  const repoName = event.repo?.name ? event.repo.name.replace(`${PERSONAL_INFO.socials.github.split('/').pop()}/`, '') : 'repo';

  return (
    <motion.a
      href={`https://github.com/${event.repo.name}`}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-white/10"
    >
      <div className={`p-2 rounded-lg ${info.bg} ${info.color} mt-1 shrink-0`}>
        <info.icon size={18} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {info.action}
          </p>
          <span className="text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap font-mono">
            {timeAgo(event.created_at)}
          </span>
        </div>
        
        {info.target && (
          <p className="text-xs text-slate-600 dark:text-gray-300 mt-0.5 line-clamp-1 italic font-medium">
            "{info.target}"
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-200 font-medium border border-transparent dark:border-white/10">
            {repoName}
          </span>
        </div>
      </div>

      <ExternalLink size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
    </motion.a>
  );
};

const GitHubFeed = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchGitHubActivity = async () => {
    try {
      setLoading(true);
      const username = PERSONAL_INFO.socials.github.split('/').pop();
      const response = await fetch(`https://api.github.com/users/${username}/events/public`);
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      const relevantEvents = data
        .filter(event => ['PushEvent', 'PullRequestEvent', 'CreateEvent', 'WatchEvent'].includes(event.type))
        .slice(0, 10); 
      
      setActivities(relevantEvents);
      setError(false);
    } catch (err) {
      console.error("GitHub API Error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGitHubActivity();
    const interval = setInterval(fetchGitHubActivity, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    // GLOW CARD STYLE APPLIED HERE
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 max-w-md w-full overflow-hidden flex flex-col h-[500px] bg-slate-50/50 dark:bg-white/5 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(45,212,191,0.1)]">
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-[#0F172A]/50 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="text-slate-900 dark:text-white" size={20} />
            <h3 className="font-bold text-slate-900 dark:text-white">Recent Activity</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-slate-500 dark:text-gray-300 uppercase tracking-wider font-bold">Live</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {loading && activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-xs">Connecting to GitHub...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2 text-center">
            <AlertCircle size={24} />
            <span className="text-sm">Unable to load feed.</span>
            <button 
              onClick={fetchGitHubActivity}
              className="mt-2 text-xs text-primary underline hover:text-teal-400"
            >
              Retry
            </button>
          </div>
        ) : (
          <AnimatePresence mode='popLayout'>
             {activities.length > 0 ? (
                activities.map((event, index) => (
                  <ActivityItem key={event.id} event={event} index={index} />
                ))
             ) : (
               <div className="text-center py-10 text-slate-500 text-sm">No recent public activity found.</div>
             )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default GitHubFeed;