/**
 * ReviewHelpfulVote Component (M7)
 *
 * "Was this helpful?" thumbs-up/down button pair for review cards.
 * Handles authenticated voting with optimistic UI.
 */

"use client";

import { useState, useTransition } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { voteReviewHelpful, removeReviewVote } from "@/lib/services/reviews";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewHelpfulVoteProps {
  reviewId: string;
  helpfulCount: number;
  unhelpfulCount: number;
  /** The current user's existing vote (true = helpful, false = unhelpful, null = no vote). */
  currentUserVote: boolean | null | undefined;
  /** Whether the user is authenticated. */
  isAuthenticated: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewHelpfulVote({
  reviewId,
  helpfulCount: initialHelpful,
  unhelpfulCount: initialUnhelpful,
  currentUserVote: initialVote,
  isAuthenticated,
}: ReviewHelpfulVoteProps) {
  const [isPending, startTransition] = useTransition();
  const [helpfulCount, setHelpfulCount] = useState(initialHelpful);
  const [unhelpfulCount, setUnhelpfulCount] = useState(initialUnhelpful);
  const [userVote, setUserVote] = useState<boolean | null | undefined>(initialVote);

  const handleVote = (isHelpful: boolean) => {
    if (!isAuthenticated) return;

    // Optimistic update
    const previousVote = userVote;
    const previousHelpful = helpfulCount;
    const previousUnhelpful = unhelpfulCount;

    if (userVote === isHelpful) {
      // Toggle off (remove vote)
      setUserVote(null);
      if (isHelpful) {
        setHelpfulCount((c) => Math.max(0, c - 1));
      } else {
        setUnhelpfulCount((c) => Math.max(0, c - 1));
      }

      startTransition(async () => {
        const result = await removeReviewVote(reviewId);
        if (!result.success) {
          // Revert on failure
          setUserVote(previousVote);
          setHelpfulCount(previousHelpful);
          setUnhelpfulCount(previousUnhelpful);
        }
      });
    } else {
      // Set or change vote
      setUserVote(isHelpful);

      // If switching from one to the other
      if (previousVote === true) {
        setHelpfulCount((c) => Math.max(0, c - 1));
      } else if (previousVote === false) {
        setUnhelpfulCount((c) => Math.max(0, c - 1));
      }

      if (isHelpful) {
        setHelpfulCount((c) => c + 1);
      } else {
        setUnhelpfulCount((c) => c + 1);
      }

      startTransition(async () => {
        const result = await voteReviewHelpful(reviewId, isHelpful);
        if (!result.success) {
          // Revert on failure
          setUserVote(previousVote);
          setHelpfulCount(previousHelpful);
          setUnhelpfulCount(previousUnhelpful);
        }
      });
    }
  };

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-gray-400">Helpful?</span>

      <button
        onClick={() => handleVote(true)}
        disabled={isPending || !isAuthenticated}
        title={isAuthenticated ? "Mark as helpful" : "Sign in to vote"}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
          userVote === true
            ? "bg-teal-50 text-teal-700 border border-teal-200"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 border border-transparent",
          isPending && "opacity-50 cursor-not-allowed",
          !isAuthenticated && "cursor-default opacity-60"
        )}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
        {helpfulCount > 0 && <span>{helpfulCount}</span>}
      </button>

      <button
        onClick={() => handleVote(false)}
        disabled={isPending || !isAuthenticated}
        title={isAuthenticated ? "Mark as unhelpful" : "Sign in to vote"}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
          userVote === false
            ? "bg-red-50 text-red-700 border border-red-200"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 border border-transparent",
          isPending && "opacity-50 cursor-not-allowed",
          !isAuthenticated && "cursor-default opacity-60"
        )}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
        {unhelpfulCount > 0 && <span>{unhelpfulCount}</span>}
      </button>
    </div>
  );
}
