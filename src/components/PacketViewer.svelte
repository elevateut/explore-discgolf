<script lang="ts">
  /**
   * PacketViewer — generates and displays a BLM engagement packet
   * for a specific field office using the generatePacket Astro Action.
   *
   * Usage: <PacketViewer client:visible officeId="UTC01000" officeName="Cedar City" />
   */

  import { marked } from "marked";

  interface Props {
    officeId: string;
    officeName: string;
  }

  let { officeId, officeName }: Props = $props();

  // --- State ---
  type Status = "idle" | "loading" | "success" | "error" | "unavailable";

  let status = $state<Status>("idle");
  let errorMessage = $state("");
  let activeTab = $state(0);
  let elapsedSeconds = $state(0);
  let timerInterval = $state<ReturnType<typeof setInterval> | null>(null);

  interface Packet {
    officeId: string;
    onePager: string;
    alignmentMemo: string;
    coverLetter: string;
    suggestedContacts: string;
    generatedAt: string;
  }

  let packet = $state<Packet | null>(null);
  let source = $state<"cache" | "generated" | null>(null);

  const tabs = [
    { label: "One-Pager", key: "onePager" as const },
    { label: "EXPLORE Act Alignment", key: "alignmentMemo" as const },
    { label: "Cover Letter", key: "coverLetter" as const },
    { label: "Suggested Contacts", key: "suggestedContacts" as const },
  ];

  const progressMessages = [
    "Gathering office context and location data...",
    "Researching nearby recreation sites...",
    "Analyzing EXPLORE Act alignment opportunities...",
    "Drafting your one-pager...",
    "Writing the cover letter...",
    "Identifying suggested contacts...",
    "Assembling your engagement packet...",
    "Polishing the final documents...",
    "Almost there, finalizing...",
  ];

  let progressMessage = $derived(
    progressMessages[Math.min(Math.floor(elapsedSeconds / 4), progressMessages.length - 1)]
  );

  let activeContent = $derived(
    packet ? packet[tabs[activeTab].key] : ""
  );

  // Configure marked for safe output
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  function renderMarkdown(md: string): string {
    if (!md) return "<p class='text-base-content/50 italic'>No content available.</p>";
    return marked.parse(md) as string;
  }

  function startTimer() {
    elapsedSeconds = 0;
    timerInterval = setInterval(() => {
      elapsedSeconds += 1;
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  async function generate(forceRegenerate = false) {
    status = "loading";
    errorMessage = "";
    startTimer();

    try {
      const res = await fetch("/_actions/generatePacket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officeId,
          forceRegenerate,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const json = await res.json();
      const data = json.data ?? json;

      if (data.error) {
        // Distinguish API key not configured from other errors
        if (data.error.includes("API key") || data.error.includes("not available")) {
          status = "unavailable";
          errorMessage = data.error;
        } else {
          status = "error";
          errorMessage = data.error;
        }
        return;
      }

      if (data.packet) {
        packet = data.packet;
        source = data.source ?? null;
        activeTab = 0;
        status = "success";
      } else {
        status = "error";
        errorMessage = "Unexpected response format from the server.";
      }
    } catch (err: any) {
      status = "error";
      errorMessage = err.message || "An unexpected error occurred.";
    } finally {
      stopTimer();
    }
  }
</script>

<div class="packet-viewer">
  <!-- Idle state: show the build button -->
  {#if status === "idle"}
    <div class="text-right">
      <button
        class="btn btn-primary btn-lg"
        onclick={() => generate()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
        </svg>
        Build My Packet
      </button>
      <p class="text-xs text-base-content/50 mt-1">
        AI-generated engagement materials for {officeName}
      </p>
    </div>
  {/if}

  <!-- Loading state -->
  {#if status === "loading"}
    <div class="card bg-base-200">
      <div class="card-body items-center text-center py-12">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <h3 class="text-lg font-semibold mt-4">Building Your Packet</h3>
        <p class="text-sm text-base-content/60 mt-1 max-w-md">
          {progressMessage}
        </p>
        <div class="mt-4 flex items-center gap-2 text-xs text-base-content/40">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
          </svg>
          <span>{elapsedSeconds}s elapsed — this typically takes 15-30 seconds</span>
        </div>
        <!-- Progress bar -->
        <div class="w-full max-w-xs mt-3">
          <progress
            class="progress progress-primary w-full"
            value={Math.min(elapsedSeconds, 30)}
            max="30"
          ></progress>
        </div>
      </div>
    </div>
  {/if}

  <!-- Unavailable state (no API key) -->
  {#if status === "unavailable"}
    <div class="card bg-base-200">
      <div class="card-body">
        <div class="flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-info shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="font-semibold">AI Packet Generation Not Configured</h3>
            <p class="text-sm text-base-content/60 mt-1">
              This feature uses the Anthropic Claude API to generate customized engagement
              materials for each BLM office. To enable it, add an <code class="bg-base-300 px-1.5 py-0.5 rounded text-xs">ANTHROPIC_API_KEY</code>
              to the environment configuration.
            </p>
            <p class="text-sm text-base-content/60 mt-2">
              In the meantime, you can use our
              <a href="/resources" class="link link-primary">general resources</a>
              to prepare your outreach.
            </p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Error state -->
  {#if status === "error"}
    <div class="card bg-base-200">
      <div class="card-body">
        <div role="alert" class="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="font-bold">Generation Failed</h3>
            <p class="text-sm">{errorMessage}</p>
          </div>
        </div>
        <div class="card-actions justify-end mt-3">
          <button
            class="btn btn-primary btn-sm"
            onclick={() => generate()}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Success state: tabbed packet viewer -->
  {#if status === "success" && packet}
    <div class="card bg-base-200">
      <div class="card-body p-0">
        <!-- Header bar -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-6 pt-5 pb-3">
          <div>
            <h2 class="text-lg font-bold">Engagement Packet</h2>
            <p class="text-xs text-base-content/50 mt-0.5">
              {#if source === "cache"}
                Loaded from cache
              {:else}
                Freshly generated
              {/if}
              {#if packet.generatedAt}
                &mdash; {new Date(packet.generatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              {/if}
            </p>
          </div>
          <button
            class="btn btn-outline btn-sm"
            onclick={() => generate(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
            </svg>
            Regenerate
          </button>
        </div>

        <!-- Tabs -->
        <div class="border-b border-base-300 px-6 overflow-x-auto">
          <div role="tablist" class="tabs tabs-bordered -mb-px">
            {#each tabs as tab, i}
              <button
                role="tab"
                class="tab whitespace-nowrap {activeTab === i ? 'tab-active font-semibold' : ''}"
                style={activeTab === i ? "border-color: #B85C38; color: #B85C38;" : ""}
                onclick={() => activeTab = i}
                aria-selected={activeTab === i}
              >
                {tab.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Tab content -->
        <div class="px-6 py-5">
          <article class="prose prose-sm max-w-none packet-content">
            {@html renderMarkdown(activeContent)}
          </article>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Scope prose styling for the rendered markdown */
  .packet-content :global(h1) {
    font-size: 1.5rem;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 0.75rem;
    color: #1E2D3B;
  }

  .packet-content :global(h2) {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    color: #1E2D3B;
  }

  .packet-content :global(h3) {
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
    color: #1E2D3B;
  }

  .packet-content :global(p) {
    margin-bottom: 0.75rem;
    line-height: 1.65;
  }

  .packet-content :global(ul),
  .packet-content :global(ol) {
    margin-bottom: 0.75rem;
    padding-left: 1.5rem;
  }

  .packet-content :global(li) {
    margin-bottom: 0.35rem;
  }

  .packet-content :global(strong) {
    font-weight: 600;
  }

  .packet-content :global(a) {
    color: #B85C38;
    text-decoration: underline;
  }

  .packet-content :global(blockquote) {
    border-left: 3px solid #B85C38;
    padding-left: 1rem;
    margin: 1rem 0;
    color: #1E2D3B;
    opacity: 0.8;
    font-style: italic;
  }

  .packet-content :global(code) {
    background-color: rgba(0, 0, 0, 0.06);
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
  }

  .packet-content :global(hr) {
    margin: 1.5rem 0;
    border-color: rgba(0, 0, 0, 0.1);
  }

  .packet-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    font-size: 0.875rem;
  }

  .packet-content :global(th),
  .packet-content :global(td) {
    border: 1px solid rgba(0, 0, 0, 0.1);
    padding: 0.5rem 0.75rem;
    text-align: left;
  }

  .packet-content :global(th) {
    background-color: rgba(0, 0, 0, 0.04);
    font-weight: 600;
  }
</style>
