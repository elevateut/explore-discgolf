<script lang="ts">
  /**
   * OfficeCard — displays a single BLM office with contact info,
   * engagement status, and a CTA to generate a proposal packet.
   */

  import type { BLMOffice, EngagementStatus } from "@lib/blm/types";

  interface Props {
    office: BLMOffice;
    engagement?: EngagementStatus;
  }

  let { office, engagement }: Props = $props();

  /** Map engagement status to a human-readable label and DaisyUI badge color. */
  function statusBadge(status: EngagementStatus["status"]): {
    label: string;
    class: string;
  } {
    const map: Record<EngagementStatus["status"], { label: string; class: string }> = {
      "no-contact": { label: "No Contact", class: "badge-ghost" },
      "initial-outreach": { label: "Outreach Sent", class: "badge-info" },
      "meeting-scheduled": { label: "Meeting Scheduled", class: "badge-warning" },
      "meeting-completed": { label: "Meeting Done", class: "badge-accent" },
      "proposal-submitted": { label: "Proposal Sent", class: "badge-secondary" },
      "project-active": { label: "Project Active", class: "badge-primary" },
      "course-built": { label: "Course Built!", class: "badge-success" },
    };
    return map[status];
  }

  const badge = engagement ? statusBadge(engagement.status) : null;
</script>

<div class="card bg-base-100 shadow-md">
  <div class="card-body">
    <!-- Header: name + type badge -->
    <div class="flex items-start justify-between gap-2">
      <h2 class="card-title text-lg">{office.name}</h2>
      <span class="badge badge-outline badge-sm capitalize">{office.type}</span>
    </div>

    <!-- Location -->
    <p class="text-sm text-base-content/70">{office.state}</p>

    <!-- Contact info -->
    <div class="text-sm space-y-1 mt-2">
      {#if office.address}
        <p>{office.address}</p>
      {/if}
      {#if office.phone}
        <p>
          <span class="font-medium">Phone:</span>
          <a href="tel:{office.phone}" class="link link-hover">{office.phone}</a>
        </p>
      {/if}
      {#if office.email}
        <p>
          <span class="font-medium">Email:</span>
          <a href="mailto:{office.email}" class="link link-hover">{office.email}</a>
        </p>
      {/if}
      {#if office.recreationPlannerName}
        <p class="mt-1">
          <span class="font-medium">Recreation Planner:</span>
          {office.recreationPlannerName}
          {#if office.recreationPlannerEmail}
            (<a href="mailto:{office.recreationPlannerEmail}" class="link link-hover"
              >{office.recreationPlannerEmail}</a
            >)
          {/if}
        </p>
      {/if}
    </div>

    <!-- Engagement status -->
    {#if badge}
      <div class="mt-3">
        <span class="badge {badge.class}">{badge.label}</span>
        {#if engagement?.notes}
          <p class="text-xs text-base-content/50 mt-1">{engagement.notes}</p>
        {/if}
      </div>
    {/if}

    <!-- Actions -->
    <div class="card-actions justify-end mt-4">
      <button class="btn btn-primary btn-sm">Build My Packet</button>
    </div>
  </div>
</div>
