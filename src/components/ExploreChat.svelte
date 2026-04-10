<script lang="ts">
  /**
   * ExploreChat — interactive brainstorming chat with Claude
   * about disc golf development on BLM public lands.
   *
   * Streams Claude responses in real-time, shows tool execution status,
   * and offers to generate a formal engagement packet after 3+ exchanges.
   *
   * Usage: <ExploreChat client:visible officeId="UTC01000" officeName="Cedar City" officeState="UT" />
   */

  import { marked } from "marked";

  interface Props {
    officeId: string;
    officeName: string;
    officeState: string;
  }

  let { officeId, officeName, officeState }: Props = $props();

  // --- Types ---
  interface ToolStatus {
    name: string;
    display: string;
    done: boolean;
  }

  interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    tools?: ToolStatus[];
  }

  type Status = "idle" | "streaming" | "error" | "unavailable";

  interface Packet {
    officeId: string;
    onePager: string;
    alignmentMemo: string;
    coverLetter: string;
    suggestedContacts: string;
    generatedAt: string;
  }

  // --- State ---
  let messages = $state<ChatMessage[]>([]);
  let status = $state<Status>("idle");
  let inputText = $state("");
  let conversationId = $state<string | null>(null);
  let errorMessage = $state("");
  let packetGenerating = $state(false);
  let packetData = $state<Packet | null>(null);
  let packetActiveTab = $state(0);

  let messageListEl: HTMLDivElement | undefined = $state();
  let textareaEl: HTMLTextAreaElement | undefined = $state();

  // --- Derived ---
  let showPacketButton = $derived(messages.length >= 6 && !packetData);
  let canSend = $derived(inputText.trim().length > 0 && status !== "streaming");

  const packetTabs = [
    { label: "One-Pager", key: "onePager" as const },
    { label: "EXPLORE Act Alignment", key: "alignmentMemo" as const },
    { label: "Cover Letter", key: "coverLetter" as const },
    { label: "Suggested Contacts", key: "suggestedContacts" as const },
  ];

  let activePacketContent = $derived(
    packetData ? packetData[packetTabs[packetActiveTab].key] : ""
  );

  // --- Markdown rendering ---
  marked.setOptions({ breaks: true, gfm: true });

  function renderMarkdown(md: string): string {
    if (!md) return "";
    return marked.parse(md) as string;
  }

  // --- Auto-scroll ---
  function scrollToBottom() {
    if (messageListEl) {
      requestAnimationFrame(() => {
        messageListEl!.scrollTop = messageListEl!.scrollHeight;
      });
    }
  }

  // --- Auto-resize textarea ---
  function autoResizeTextarea() {
    if (textareaEl) {
      textareaEl.style.height = "auto";
      textareaEl.style.height = Math.min(textareaEl.scrollHeight, 150) + "px";
    }
  }

  // --- On mount: load existing conversation ---
  $effect(() => {
    loadExistingConversation();
  });

  // --- Scroll when messages change ---
  $effect(() => {
    // Track messages length to trigger scroll
    messages.length;
    scrollToBottom();
  });

  async function loadExistingConversation() {
    try {
      const res = await fetch(
        `/api/chat/conversation?officeId=${encodeURIComponent(officeId)}&sessionId=anonymous`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.conversation && data.messages?.length > 0) {
        conversationId = data.conversation.id;
        messages = data.messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        return;
      }
    } catch {
      // Silently fail
    }

    // No existing conversation — auto-start with an intro message
    if (messages.length === 0) {
      autoStart();
    }
  }

  // --- Auto-start: send the first message without waiting for user ---
  async function autoStart() {
    const openingMessage = "What are the best opportunities for disc golf development at this office?";
    await sendMessageText(openingMessage);
  }

  // --- Send message ---
  async function sendMessage() {
    if (!canSend) return;
    const userText = inputText.trim();
    inputText = "";
    if (textareaEl) {
      textareaEl.style.height = "auto";
    }
    await sendMessageText(userText);
  }

  async function sendMessageText(userText: string) {
    // Add user message
    messages = [...messages, { role: "user", content: userText }];

    // Add placeholder assistant message
    messages = [...messages, { role: "assistant", content: "", tools: [] }];
    status = "streaming";
    errorMessage = "";

    try {
      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          officeId,
          messages: messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
          userMessage: userText,
        }),
      });

      if (!response.ok || !response.body) {
        status = "error";
        errorMessage = `Server responded with status ${response.status}`;
        // Remove empty assistant placeholder
        messages = messages.slice(0, -1);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantIndex = messages.length - 1;

      while (true) {
        let readResult: ReadableStreamReadResult<Uint8Array>;
        try {
          readResult = await reader.read();
        } catch (readErr) {
          console.error("[ExploreChat] Stream read error:", readErr);
          break;
        }
        const { done, value } = readResult;
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop()!;

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: Record<string, any>;
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (event.type === "message_start") {
            if (event.conversationId) {
              conversationId = event.conversationId;
            }
          } else if (event.type === "text_delta") {
            const updated = [...messages];
            updated[assistantIndex] = {
              ...updated[assistantIndex],
              content: updated[assistantIndex].content + event.text,
            };
            messages = updated;
            scrollToBottom();
          } else if (event.type === "tool_start") {
            const updated = [...messages];
            const tools = [...(updated[assistantIndex].tools ?? [])];
            tools.push({
              name: event.name,
              display: event.display,
              done: false,
            });
            updated[assistantIndex] = { ...updated[assistantIndex], tools };
            messages = updated;
          } else if (event.type === "tool_done") {
            const updated = [...messages];
            const tools = (updated[assistantIndex].tools ?? []).map((t) =>
              t.name === event.name ? { ...t, done: true } : t
            );
            updated[assistantIndex] = { ...updated[assistantIndex], tools };
            messages = updated;
          } else if (event.type === "done") {
            if (event.conversationId) {
              conversationId = event.conversationId;
            }
            status = "idle";
          } else if (event.type === "error") {
            if (event.message?.includes("API key") || event.message?.includes("not configured")) {
              status = "unavailable";
              errorMessage = event.message;
            } else {
              status = "error";
              errorMessage = event.message ?? "An error occurred";
            }
            // Remove empty assistant message if no content
            if (!messages[assistantIndex]?.content) {
              messages = messages.slice(0, -1);
            }
          }
        }
      }

      // Ensure we exit streaming state
      if (status === "streaming") {
        status = "idle";
      }
    } catch (err: any) {
      status = "error";
      errorMessage = err.message ?? "Failed to send message";
      // Remove empty assistant message if no content
      const last = messages[messages.length - 1];
      if (last?.role === "assistant" && !last.content) {
        messages = messages.slice(0, -1);
      }
    }
  }

  // --- Retry after error ---
  function retry() {
    // Remove the last user message and resend
    const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
    if (lastUserIndex >= 0) {
      const userText = messages[lastUserIndex].content;
      messages = messages.slice(0, lastUserIndex);
      inputText = userText;
      status = "idle";
      errorMessage = "";
    }
  }

  // --- New conversation ---
  function startNewConversation() {
    messages = [];
    conversationId = null;
    status = "idle";
    errorMessage = "";
    inputText = "";
    packetData = null;
    packetGenerating = false;
  }

  // --- Generate packet ---
  async function generatePacket() {
    if (!conversationId || packetGenerating) return;

    packetGenerating = true;
    errorMessage = "";

    try {
      const res = await fetch("/api/chat/generate-packet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, officeId }),
      });

      const data = await res.json();

      if (data.error) {
        errorMessage = data.error;
        return;
      }

      if (data.data?.packet) {
        packetData = data.data.packet;
        packetActiveTab = 0;
      }
    } catch (err: any) {
      errorMessage = err.message ?? "Failed to generate packet";
    } finally {
      packetGenerating = false;
    }
  }

  // --- Keyboard handling ---
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }
</script>

<div class="explore-chat card bg-base-100 shadow-lg border border-base-300">
  <!-- Header -->
  <div class="card-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-5 py-4 border-b border-base-300 bg-base-200 rounded-t-2xl">
    <div>
      <h2 class="text-lg font-bold text-base-content font-heading flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-info" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zm-4 0H9v2h2V9z" clip-rule="evenodd" />
        </svg>
        Explore Ideas
      </h2>
      <p class="text-xs text-base-content/50 mt-0.5">
        Brainstorm disc golf opportunities with {officeName}, {officeState}
      </p>
    </div>
    <div class="flex items-center gap-2">
      {#if showPacketButton && conversationId}
        <button
          class="btn btn-info btn-sm"
          onclick={generatePacket}
          disabled={packetGenerating}
        >
          {#if packetGenerating}
            <span class="loading loading-spinner loading-xs"></span>
            Generating...
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
            </svg>
            Generate Packet
          {/if}
        </button>
      {/if}
      {#if messages.length > 0}
        <button
          class="btn btn-ghost btn-sm"
          onclick={startNewConversation}
          title="Start a new conversation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
          </svg>
          New
        </button>
      {/if}
    </div>
  </div>

  <!-- Unavailable state -->
  {#if status === "unavailable"}
    <div class="p-5">
      <div class="flex items-start gap-3 p-4 bg-base-200 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-info shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="font-semibold">AI Chat Not Configured</h3>
          <p class="text-sm text-base-content/60 mt-1">
            This feature uses the Anthropic Claude API to brainstorm disc golf opportunities.
            To enable it, add an <code class="bg-base-300 px-1.5 py-0.5 rounded text-xs">ANTHROPIC_API_KEY</code>
            to the environment configuration.
          </p>
          <p class="text-sm text-base-content/60 mt-2">
            In the meantime, check out our
            <a href="/resources" class="link link-primary">general resources</a>
            for engaging with BLM field offices.
          </p>
        </div>
      </div>
    </div>
  {:else}
    <!-- Message list -->
    <div
      bind:this={messageListEl}
      class="message-list flex flex-col gap-3 p-4 overflow-y-auto"
    >
      {#if messages.length === 0 && status !== "streaming"}
        <!-- Welcome / empty state -->
        <div class="text-center py-10 px-4">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-info/10 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 class="text-base font-semibold text-base-content mb-2">
            Start Exploring Ideas
          </h3>
          <p class="text-sm text-base-content/60 max-w-sm mx-auto">
            Ask about disc golf opportunities on BLM land managed by
            the {officeName} office. Try topics like trail access,
            existing recreation areas, or community partnerships.
          </p>
        </div>
      {/if}

      {#each messages as message, i}
        <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div class="chat-bubble-wrapper max-w-[85%] sm:max-w-[75%]">
            {#if message.role === "user"}
              <!-- User message -->
              <div class="user-bubble rounded-lg rounded-br-sm px-4 py-2.5">
                <p class="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            {:else}
              <!-- Assistant message -->
              <div class="assistant-bubble rounded-lg rounded-bl-sm px-4 py-3">
                <!-- Tool status chips -->
                {#if message.tools && message.tools.length > 0}
                  <div class="flex flex-wrap gap-1.5 mb-2">
                    {#each message.tools as tool}
                      <span class="tool-chip inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full">
                        {#if tool.done}
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-success" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                        {:else}
                          <span class="loading loading-spinner" style="width: 0.75rem; height: 0.75rem; color: #1A8BA3;"></span>
                        {/if}
                        <span>{tool.display}</span>
                      </span>
                    {/each}
                  </div>
                {/if}

                <!-- Message content -->
                {#if message.content}
                  <div class="chat-markdown text-sm">
                    {@html renderMarkdown(message.content)}
                  </div>
                {:else if status === "streaming" && i === messages.length - 1}
                  <!-- Typing indicator -->
                  <div class="flex items-center gap-1 py-1">
                    <span class="typing-dot"></span>
                    <span class="typing-dot" style="animation-delay: 0.15s;"></span>
                    <span class="typing-dot" style="animation-delay: 0.3s;"></span>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/each}

      <!-- Error message inline -->
      {#if status === "error"}
        <div class="flex justify-center">
          <div class="flex items-center gap-2 bg-error/10 text-error text-sm px-4 py-2 rounded-lg max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
            <button class="btn btn-ghost btn-xs text-error" onclick={retry}>Retry</button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Input bar -->
    <div class="border-t border-base-300 p-3 bg-base-100 rounded-b-2xl">
      <form
        class="flex items-end gap-2"
        onsubmit={(e) => { e.preventDefault(); sendMessage(); }}
      >
        <textarea
          bind:this={textareaEl}
          bind:value={inputText}
          oninput={autoResizeTextarea}
          onkeydown={handleKeydown}
          placeholder="Ask about disc golf on BLM land..."
          class="textarea textarea-bordered flex-1 min-h-[2.5rem] max-h-[9.5rem] resize-none text-sm leading-snug"
          rows="1"
          disabled={status === "streaming" || status === "unavailable"}
        ></textarea>
        <button
          type="submit"
          class="btn btn-primary btn-sm h-10 w-10 p-0 shrink-0"
          disabled={!canSend}
          title="Send message"
        >
          {#if status === "streaming"}
            <span class="loading loading-spinner loading-xs"></span>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          {/if}
        </button>
      </form>
    </div>
  {/if}

  <!-- Generated packet card -->
  {#if packetData}
    <div class="border-t-2 border-info">
      <div class="px-5 pt-4 pb-3 bg-base-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 class="text-base font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-info" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clip-rule="evenodd" />
            </svg>
            Engagement Packet Ready
          </h3>
          <p class="text-xs text-base-content/50 mt-0.5">
            Generated from your conversation
            {#if packetData.generatedAt}
              &mdash; {new Date(packetData.generatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            {/if}
          </p>
        </div>
        <a
          href={`/api/packet/${officeId}.pdf`}
          class="btn btn-primary btn-sm"
          download
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          Download PDF
        </a>
      </div>

      <!-- Packet tabs -->
      <div class="border-b border-base-300 px-5 overflow-x-auto">
        <div role="tablist" class="tabs tabs-bordered -mb-px">
          {#each packetTabs as tab, i}
            <button
              role="tab"
              class="tab whitespace-nowrap {packetActiveTab === i ? 'tab-active font-semibold' : ''}"
              style={packetActiveTab === i ? "border-color: #B85C38; color: #B85C38;" : ""}
              onclick={() => packetActiveTab = i}
              aria-selected={packetActiveTab === i}
            >
              {tab.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Packet content -->
      <div class="px-5 py-4">
        <article class="prose prose-sm max-w-none packet-content">
          {@html renderMarkdown(activePacketContent)}
        </article>
      </div>
    </div>
  {/if}
</div>

<style>
  /* --- Layout --- */
  .explore-chat {
    display: flex;
    flex-direction: column;
    max-height: 700px;
    overflow: hidden;
  }

  .message-list {
    flex: 1;
    max-height: 500px;
    scroll-behavior: smooth;
  }

  /* --- User bubble --- */
  .user-bubble {
    background-color: #B85C38;
    color: #FEFDFB;
  }

  /* --- Assistant bubble --- */
  .assistant-bubble {
    background-color: #F5F0E8;
    color: #1E2D3B;
  }

  /* --- Tool status chip --- */
  .tool-chip {
    background-color: rgba(26, 139, 163, 0.1);
    color: #1A8BA3;
    font-weight: 500;
  }

  /* --- Typing indicator --- */
  .typing-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #1A8BA3;
    animation: typingBounce 0.8s ease-in-out infinite alternate;
  }

  @keyframes typingBounce {
    0% { opacity: 0.3; transform: translateY(0); }
    100% { opacity: 1; transform: translateY(-3px); }
  }

  /* --- Markdown styles for chat messages --- */
  .chat-markdown :global(h1) {
    font-size: 1.25rem;
    font-weight: 700;
    margin-top: 0.75rem;
    margin-bottom: 0.5rem;
    color: #1E2D3B;
  }

  .chat-markdown :global(h2) {
    font-size: 1.125rem;
    font-weight: 600;
    margin-top: 0.75rem;
    margin-bottom: 0.375rem;
    color: #1E2D3B;
  }

  .chat-markdown :global(h3) {
    font-size: 1rem;
    font-weight: 600;
    margin-top: 0.625rem;
    margin-bottom: 0.375rem;
    color: #1E2D3B;
  }

  .chat-markdown :global(p) {
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }

  .chat-markdown :global(p:last-child) {
    margin-bottom: 0;
  }

  .chat-markdown :global(ul),
  .chat-markdown :global(ol) {
    margin-bottom: 0.5rem;
    padding-left: 1.25rem;
  }

  .chat-markdown :global(ul) {
    list-style-type: disc;
  }

  .chat-markdown :global(ol) {
    list-style-type: decimal;
  }

  .chat-markdown :global(li) {
    margin-bottom: 0.25rem;
  }

  .chat-markdown :global(strong) {
    font-weight: 600;
  }

  .chat-markdown :global(a) {
    color: #B85C38;
    text-decoration: underline;
  }

  .chat-markdown :global(blockquote) {
    border-left: 3px solid #B85C38;
    padding-left: 0.75rem;
    margin: 0.5rem 0;
    color: #1E2D3B;
    opacity: 0.85;
    font-style: italic;
  }

  .chat-markdown :global(code) {
    background-color: rgba(0, 0, 0, 0.06);
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
    font-size: 0.85em;
  }

  .chat-markdown :global(pre) {
    background-color: #1E2D3B;
    color: #F5F0E8;
    padding: 0.75rem;
    border-radius: 0.375rem;
    overflow-x: auto;
    margin: 0.5rem 0;
    font-size: 0.8rem;
  }

  .chat-markdown :global(pre code) {
    background: none;
    padding: 0;
    border-radius: 0;
  }

  /* --- Packet content (mirrors PacketViewer) --- */
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
