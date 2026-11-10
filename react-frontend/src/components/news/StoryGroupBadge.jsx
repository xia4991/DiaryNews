import Badge from '../ui/Badge'

/**
 * "N 家媒体报道" — surfaces the cross-source dedup signal. The backend collapses the
 * same story across outlets and attaches story_group_size + story_group_sources; this
 * badge turns that into a credibility / "big story" cue. Renders nothing for singletons.
 */
export default function StoryGroupBadge({ size, className = '' }) {
  if (!size || size <= 1) return null
  return (
    <Badge variant="pill" color="#2B6CB0" icon="newspaper" className={className}>
      {size} 家媒体报道
    </Badge>
  )
}
