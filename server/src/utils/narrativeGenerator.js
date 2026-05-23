export const generateCategoryNarrative = (categoryName, volumeChange, topQuery) => {
  const direction = volumeChange > 0 ? "increased" : volumeChange < 0 ? "decreased" : "held steady";
  const magnitude = Math.abs(Number(volumeChange) || 0);
  const queryClause = topQuery
    ? ` The top unanswered query is '${topQuery}'.`
    : " No dominant unanswered query has emerged yet.";
  const recommendation =
    volumeChange > 15
      ? " Consider creating a dedicated FAQ before the next deadline spike."
      : volumeChange < -15
        ? " Keep monitoring, but current interventions appear to be reducing confusion."
        : " Maintain coverage and watch for a sharper signal before changing policy content.";

  return `${categoryName} category volume ${direction} ${magnitude}% this week.${queryClause}${recommendation}`;
};

export const generateFaqNarrative = (faq, action) => {
  const helpfulness = Math.round((faq.helpfulnessRatio || 0) * 100);

  if (action === "rewrite") {
    return `${faq.title} is highly visible but only ${helpfulness}% helpful. Rewrite the answer and check whether the policy wording has drifted.`;
  }

  if (action === "archive") {
    return `${faq.title} has low quality and low demand. Archive it or merge it into a stronger canonical answer.`;
  }

  return `${faq.title} is performing within acceptable bounds. Keep monitoring repeat questions and feedback.`;
};

export const generateQueueNarrative = (pending, trend) => {
  if (pending.count === 0) {
    return "The moderation queue is clear. Keep the current review cadence.";
  }

  if (trend === "increasing") {
    return `Queue depth has grown with ${pending.count} pending answers and an average age of ${pending.avgAgeHours} hours. Assign additional moderator capacity to the highest-demand category.`;
  }

  if (trend === "decreasing") {
    return `Queue depth is decreasing with ${pending.count} pending answers remaining. Maintain the current response rhythm until the oldest items are cleared.`;
  }

  return `Queue depth is stable at ${pending.count} pending answers. Prioritize the oldest items before they cross the 72-hour trust threshold.`;
};
