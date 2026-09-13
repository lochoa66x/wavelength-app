// Compare explicit work conditions within the cited action, not a paragraph-wide
// bag of familiar words. This is a bounded condition parser, not general NLI.
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/\b(can|could|did|does|do|was|were|is|are|would)n['’]t\b/g, '$1 not');
const omitted = new Set('i my me we our a an the at to of for from and or but with in on as by was were is are have had has also all each any before after only then work worked working'.split(' '));
const aliases = { alterations:'change', alteration:'change', changes:'change', changed:'change', changing:'change', directions:'direction', instructions:'instruction', instructed:'instruction', overseeing:'supervision' };
const stem = word => aliases[word] || word.replace(/'s$/, '').replace(/ies$/, 'y').replace(/(?<!s)s$/, '').replace(/(?:ing|ed)$/, '').replace(/e$/, '');
const tokens = value => [...new Set((normalize(value).match(/[a-z]+(?:'s)?/g) || []).filter(word => !omitted.has(word)).map(stem))];
const clauses = value => normalize(value).split(/\n|;|(?<=[.!?])\s+|\s+but\s+/).map(value => value.replace(/[.!?]$/, '').trim()).filter(Boolean);
const scopeWords = value => tokens(value).filter(word => !/^(?:requir|need|optional|independent|independently|approval|permission|authorisation|authorization|supervision|direction|instruction|subject|without|not|no)$/.test(word));
const overlap = (left, right) => left.filter(word => right.includes(word)).length;
const authority = value => {
  const text = normalize(value).replace(/\b(?:a|an|the|my|our|their|by|from|of|prior|final|explicit|own)\b/g, '').replace(/'s\b/g, '').trim();
  return /^(?:i|me)$/.test(text) ? ['candidate'] : tokens(text);
};
const sameActor = (left, right) => !left.length || !right.length || overlap(left, right) === Math.min(left.length, right.length);
const conditionNouns = '(?:approval|permission|authori[sz]ation|supervision|direction|instructions?)';

export function workConditions(value) {
  return clauses(value).flatMap(text => {
    const results = [];
    // Object-first requirements: design alterations required the supervisor's approval.
    const requirement = text.match(new RegExp(`^(.*?)\\b(?:requir(?:e[ds]?|ing)|need(?:s|ed)?|subject to)\\s+(.*?)\\b(${conditionNouns})\\b(.*)$`));
    if (requirement) {
      const [, object, prefix, noun, suffix] = requirement;
      const actorText = prefix.replace(/\b(?:no|not|any|an?|the|prior|final|explicit)\b/g, '').trim() || suffix.match(/^\s+(?:from|by|of)\s+(.+?)(?:\s+for\b|$)/)?.[1] || '';
      results.push({ text, kind: /approval|permission|authori/.test(noun) ? 'approval' : 'supervision', object: scopeWords(object), actor: authority(actorText), required: !/\b(?:no|not|without)\b/.test(object + ' ' + prefix) });
    }
    // Approval is optional/not required for X; X needed no approval.
    const inverted = text.match(new RegExp(`^(.*?)\\b(${conditionNouns})\\b(?:\\s+(?:from|by|of)\\s+(.+?))?\\s+(?:is|was|were|are)\\s+(not (?:required|needed)|optional|unnecessary|required|needed)(?:\\s+for\\s+(.+))?$`));
    if (inverted) {
      const [, leading, noun, actor, state, trailing] = inverted;
      results.push({ text, kind: /approval|permission|authori/.test(noun) ? 'approval' : 'supervision', object: scopeWords(trailing || leading), actor: authority(actor || leading.match(/([a-z -]+)'s\s*$/)?.[1] || ''), required: /^(?:required|needed)$/.test(state) && !/\bno\b/.test(leading) });
    }
    // Actual approval: the supervisor approved design changes / changes were approved by the supervisor.
    const passive = text.match(/^(.*?)\b(?:was|were|is|are|been)\s+(?:reviewed and )?(approved|authori[sz]ed)\s+by\s+(.+)$/);
    const active = !passive && text.match(/^(.*?)\b(approved|authori[sz]ed)\s+(.+)$/);
    if (passive) results.push({ text, kind:'approval', object:scopeWords(passive[1]), actor:authority(passive[3]), required:true });
    else if (active && /\b(?:i|we|supervisor|manager|director|lead|technician|analyst|client|customer|curator|coordinator|adjuster|team|committee|owner|family|staff|instructor|reviewer|engineer)\s*$/.test(active[1])) results.push({ text, kind:'approval', object:scopeWords(active[3]), actor:authority(active[1]), required:true });
    // Work performed under another person's direction/instructions/supervision.
    const supervision = text.match(/^(.*?)\b(?:under|within|following|according to)\s+(.*?)\b(supervision|direction|instructions?)\b(.*)$/);
    if (supervision) {
      const [, before, actor, , after] = supervision;
      results.push({ text, kind:'supervision', object:scopeWords(before || after.replace(/^\s*,\s*/, '')), actor:authority(actor), required:true });
    }
    return results.filter(condition => condition.object.length);
  });
}

function matchedObject(left, right) {
  const count = overlap(left, right);
  return count >= Math.min(2, left.length, right.length) && count / Math.min(left.length, right.length) >= 0.5;
}

export function workConditionIssues(proposed, sources = []) {
  const sourceText = sources.map(source => typeof source === 'string' ? source : source?.excerpt || '');
  const established = sourceText.flatMap(workConditions);
  const claimed = workConditions(proposed);
  const issues = [];
  for (const condition of claimed) {
    const matching = established.filter(source => source.kind === condition.kind && matchedObject(source.object, condition.object));
    if (!matching.length) {
      if (established.some(source => source.kind === condition.kind)) issues.push('The cited approval or supervision applies to different work. Cite the condition for this action.');
      continue;
    }
    if (!matching.some(source => source.required === condition.required)) issues.push('Preserve whether this work required approval or supervision; the proposed condition contradicts its cited evidence.');
    else if (!matching.some(source => source.required === condition.required && sameActor(source.actor, condition.actor))) issues.push('Keep approval or supervision with the person established by this action’s cited evidence.');
  }
  for (const source of established.filter(condition => condition.required)) {
    for (const clause of clauses(proposed)) {
      const object = scopeWords(clause);
      if (!matchedObject(source.object, object)) continue;
      // Exact source statements already preserve the condition. A shortened
      // factual action must not discard an explicit authority constraint.
      if (sourceText.some(text => clauses(text).includes(clause))) continue;
      if (/\b(?:independently|without (?:any )?(?:approval|permission|supervision)|on my own|sole discretion)\b/.test(clause)) {
        issues.push('Work requiring approval or supervision cannot be presented as independent or unrestricted.');
        continue;
      }
      const preserved = claimed.some(condition => condition.kind === source.kind && condition.required && matchedObject(source.object, condition.object) && sameActor(source.actor, condition.actor));
      const actualAction = /\b(?:i\s+(?:also\s+)?(?:have\s+)?[a-z]+ed|(?:made|hand-sewed|repaired|prepared|operated|changed|performed|completed|approved|authori[sz]ed))\b/.test(clause);
      if (!preserved && actualAction) issues.push('Retain the cited approval or supervision condition when describing this work.');
    }
  }
  return [...new Set(issues)];
}

// An explicit resource/tool-use claim needs a matching cited work object. This
// applies equally to generated text, edits and exports, not to courtesy words.
export function explicitToolUseIssues(proposed, sources = []) {
  const known = tokens(sources.map(source => typeof source === 'string' ? source : source?.excerpt || '').join(' '));
  for (const match of normalize(proposed).matchAll(/\b(?:i (?:also )?(?:have )?(?:used|use|operated|operate|worked with|work with)|using|proficient in)\s+([^.;]+?)(?=\s+(?:to|for|during|at|under|before|after)\b|[.;]|$)/g)) {
    for (const part of match[1].split(/\s+and\s+|,/)) {
      const object = tokens(part).filter(word => !['basic', 'approv', 'suppli'].includes(word));
      if (object.length && !object.some(word => known.includes(word))) return ['The verified sources do not establish use of this tool or resource. Cite the relevant experience before adding it.'];
    }
  }
  return [];
}
