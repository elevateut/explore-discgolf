<script lang="ts">
  /**
   * CommunityConversations — list public chat conversations for a BLM office.
   *
   * Fetches from /api/chat/list?officeUuid=... and renders a responsive grid
   * of cards. Each card links to /chat/{id}. Shows skeletons while loading
   * and an empty-state CTA pointing at the on-page chat anchor (#explore).
   *
   * Usage: <CommunityConversations client:visible officeUuid="abc-123" />
   */

  interface Props {
    officeUuid: string | null;
  }

  let { officeUuid }: Props = $props();

  // --- Types ---
  interface Conversation {
    id: string;
    title: string | null;
    preview: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
  }

  type Status = "idle" | "loading" | "loaded" | "error";

  // --- State ---
  let status = $state<Status>("idle");
  let conversations = $state<Conversation[]>([]);
  let expanded = $state(false);
  let errorMessage = $state("");

  // --- Derived ---
  let hasMore = $derived(conversations.length > 6);
  let visibleConversations = $derived(
    expanded ? conversations : conversations.slice(0, 6)
  );

  // --- Fetch on mount ---
  $effect(() => {
    if (!officeUuid) return;
    loadConversations();
  });

  async function loadConversations() {
    if (!officeUuid) return;
    status = "loading";
    errorMessage = "";

    try {
      const res = await fetch(
        `/api/chat/list?officeUuid=${encodeURIComponent(officeUuid)}`
      );
      if (!res.ok) {
        throw new Error(`Failed to load conversations (${res.status})`);
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      conversations = data.conversations ?? [];
      status = "loaded";
    } catch (err) {
      console.error("[CommunityConversations] Load failed:", err);
      errorMessage = err instanceof Error ? err.message : "Failed to load";
      status = "error";
    }
  }

  // --- Helpers ---
  function getCardTitle(conv: Conversation): string {
    if (conv.title && conv.title.trim().length > 0) {
      return conv.title;
    }
    const preview = conv.preview ?? "";
    if (preview.length <= 80) return preview || "Untitled conversation";
    return preview.slice(0, 80).trimEnd() + "...";
  }

  function getCardPreview(conv: Conversation): string {
    const preview = conv.preview ?? "";
    if (preview.length <= 150) return preview;
    return preview.slice(0, 150).trimEnd() + "...";
  }

  /**
   * Format an ISO date string as a coarse relative time.
   * Examples: "Just now", "5 minutes ago", "2 hours ago", "Yesterday",
   * "3 days ago", "2 weeks ago", "1 month ago", "2 years ago".
   */
  function relativeTime(date: string): string {
    if (!date) return "";
    const then = new Date(date).getTime();
    if (Number.isNaN(then)) return "";

    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - then) / 1000));

    if (diffSec < 45) return "Just now";

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return diffMin === 1 ? "1 minute ago" : `${diffMin} minutes ago`;
    }

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) {
      return diffHour === 1 ? "1 hour ago" : `${diffHour} hours ago`;
    }

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay} days ago`;

    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 5) {
      return diffWeek === 1 ? "1 week ago" : `${diffWeek} weeks ago`;
    }

    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) {
      return diffMonth === 1 ? "1 month ago" : `${diffMonth} months ago`;
    }

    const diffYear = Math.floor(diffDay / 365);
    return diffYear === 1 ? "1 year ago" : `${diffYear} years ago`;
  }
</script>

{#if officeUuid}
  <section class="community-conversations w-full">
    {#if status === "loading" || status === "idle"}
      <!-- Skeleton state: 3 placeholder cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each Array(3) as _, i (i)}
          <div
            class="card bg-base-200 border border-base-300 shadow-sm overflow-hidden"
            aria-hidden="true"
          >
            <div class="card-body p-5 gap-3">
              <div class="skeleton-line skeleton-title"></div>
              <div class="skeleton-line skeleton-text"></div>
              <div class="skeleton-line skeleton-text skeleton-short"></div>
              <div class="flex items-center justify-between mt-2">
                <div class="skeleton-line skeleton-badge"></div>
                <div class="skeleton-line skeleton-meta"></div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else if status === "error"}
      <div
        class="rounded-lg border border-base-300 bg-base-200 p-5 text-center"
        role="alert"
      >
        <p class="text-sm text-base-content/70">
          We couldn't load community conversations right now.
        </p>
        <button
          type="button"
          class="btn btn-sm btn-ghost mt-2"
          onclick={loadConversations}
        >
          Try again
        </button>
      </div>
    {:else if conversations.length === 0}
      <!-- Empty state -->
      <div
        class="empty-state rounded-lg border border-dashed border-base-300 bg-base-200 p-8 text-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="mx-auto h-10 w-10 text-base-content/30"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
            clip-rule="evenodd"
          />
        </svg>
        <p class="mt-3 text-sm text-base-content/70">
          Be the first to start a conversation about this office.
        </p>
        <a href="#explore" class="btn btn-primary btn-sm mt-4">
          Start a conversation
        </a>
      </div>
    {:else}
      <!-- Loaded state: grid of cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each visibleConversations as conv (conv.id)}
          <a
            href={`/chat/${conv.id}`}
            class="conversation-card card bg-base-200 border border-base-300 shadow-sm overflow-hidden no-underline"
          >
            <div class="card-body p-5 gap-2">
              <h3 class="conversation-title text-base font-semibold leading-snug">
                {getCardTitle(conv)}
              </h3>
              <p class="conversation-preview text-sm text-base-content/60 leading-relaxed">
                {getCardPreview(conv)}
              </p>
              <div
                class="conversation-footer flex items-center justify-between gap-2 mt-2 pt-3 border-t border-base-300"
              >
                <span class="badge badge-info badge-sm gap-1 font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  {conv.messageCount}
                  {conv.messageCount === 1 ? "message" : "messages"}
                </span>
                <time
                  class="text-xs text-base-content/50 whitespace-nowrap"
                  datetime={conv.updatedAt}
                >
                  {relativeTime(conv.updatedAt)}
                </time>
              </div>
            </div>
          </a>
        {/each}
      </div>

      {#if hasMore && !expanded}
        <div class="mt-6 flex justify-center">
          <button
            type="button"
            class="btn btn-outline btn-sm"
            onclick={() => (expanded = true)}
          >
            See all conversations ({conversations.length})
          </button>
        </div>
      {/if}
    {/if}
  </section>
{/if}

<style>
  /* --- Card hover lift --- */
  .conversation-card {
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      border-color 0.18s ease;
    color: inherit;
    text-decoration: none;
  }

  .conversation-card:hover,
  .conversation-card:focus-visible {
    transform: translateY(-3px);
    box-shadow:
      0 10px 20px -8px rgba(30, 45, 59, 0.18),
      0 4px 8px -4px rgba(30, 45, 59, 0.08);
    border-color: #b85c38;
  }

  .conversation-card:focus-visible {
    outline: 2px solid #b85c38;
    outline-offset: 2px;
  }

  /* --- Title color (Terra Cotta) --- */
  .conversation-title {
    color: #b85c38;
    /* Clamp to two lines for visual consistency */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .conversation-preview {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* --- Skeleton loaders --- */
  .skeleton-line {
    background: linear-gradient(
      90deg,
      #ebe5da 0%,
      #f5f0e8 50%,
      #ebe5da 100%
    );
    background-size: 200% 100%;
    border-radius: 0.25rem;
    animation: skeletonShimmer 1.4s ease-in-out infinite;
  }

  .skeleton-title {
    height: 1rem;
    width: 75%;
  }

  .skeleton-text {
    height: 0.75rem;
    width: 100%;
  }

  .skeleton-short {
    width: 60%;
  }

  .skeleton-badge {
    height: 1.1rem;
    width: 5.5rem;
    border-radius: 9999px;
  }

  .skeleton-meta {
    height: 0.7rem;
    width: 4rem;
  }

  @keyframes skeletonShimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .conversation-card,
    .skeleton-line {
      transition: none;
      animation: none;
    }

    .conversation-card:hover,
    .conversation-card:focus-visible {
      transform: none;
    }
  }
</style>
