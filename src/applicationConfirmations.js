// Personal scheduling conditions are distinct from skills and document integrity.
export function pendingApplicationConfirmations(review = {}) {
  return (review.requirements || []).filter(r => r.priority === 'required'
    && ['missing','unknown'].includes(r.evidence_match)
    && /\b(?:availab(?:le|ility)|work (?:on |every )?(?:weekends?|evenings?|nights?)|start date|start immediately|willing to (?:travel|relocate))\b/i.test(r.requirement || ''))
    .map(r => ({id:r.id,requirement:r.requirement,message:`Confirm before applying: ${r.requirement}`}));
}
