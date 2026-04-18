# Community MVP Plan

Date: 2026-04-18

## Goal

Add a new `社区` module to the platform, combining:

- `活动` — structured community events
- `交流` — lightweight community discussion posts

The product intention is not to build a traditional full forum. Instead, this module should extend the platform from an information hub into a community hub, while staying lightweight, moderated, and easy to operate.

## Product Direction

`社区` should become a top-level navigation item alongside:

- 首页
- 华人关注
- 葡萄牙新闻
- 招聘
- 房产
- 二手
- 社区
- Ideas

Inside `社区`, there should be two clear sub-sections:

1. `活动`
2. `交流`

They should live in one module and one navigation entry, but not be mixed into a single feed. The user should feel that both belong to the same “community” concept while still understanding whether they are browsing structured events or discussion content.

## Why This Direction

This direction fits the current product shape better than reviving YouTube or building a heavy forum:

- The platform already covers information and classifieds
- The next natural layer is people-to-people connection
- Events are structured and low-risk to launch
- Lightweight discussion adds community activity without requiring a full forum stack
- Both features reinforce each other:
  - see an event
  - ask about the event
  - find people to join
  - organize a new meetup

## MVP Scope

The first version should be intentionally narrow.

### Included in MVP

- Community top-level tab
- Internal switch between `活动` and `交流`
- Event list and event creation
- Discussion post list and post creation
- Detail view for an event
- Detail view for a discussion post
- Simple replies for discussion posts
- Ownership actions: edit/delete own content
- Basic reporting flow for moderation

### Explicitly Excluded from MVP

- Nested reply trees
- Rich reactions / emoji systems
- Private messages
- RSVP attendee management
- Payment / ticketing
- Complex recommendation algorithms
- Reputation / badges / ranking
- Full-text search
- Notification center

## Information Architecture

### Top Level

- `社区`

### Inside 社区

- Segment switch: `活动 | 交流`

### 活动 Data Shape

Recommended event fields:

- `id`
- `title`
- `category`
- `description`
- `city`
- `venue`
- `start_at`
- `end_at`
- `is_free`
- `fee_text`
- `contact_phone`
- `contact_whatsapp`
- `contact_email`
- `signup_url`
- `owner_id`
- `status`
- `created_at`
- `updated_at`

Suggested categories:

- 聚会
- 亲子
- 讲座
- 招聘会
- 商业活动
- 运动
- 兴趣小组
- 同城聚餐
- 其他

### 交流 Data Shape

Recommended discussion post fields:

- `id`
- `title`
- `category`
- `content`
- `city`
- `owner_id`
- `status`
- `created_at`
- `updated_at`

Suggested categories:

- 生活问答
- 签证居留
- 租房买房
- 求职交流
- 二手避坑
- 本地推荐
- 同城互助
- 闲聊

### Reply Data Shape

Recommended reply fields:

- `id`
- `post_id`
- `content`
- `owner_id`
- `status`
- `created_at`
- `updated_at`

Replies should be flat in MVP: one chronological list under a post.

## UX Recommendation

### 社区首页

The `社区` tab should open into a split page with:

- top hero / intro area
- sub-navigation switch: `活动` / `交流`
- active subview content below

### 活动 View

The events subview should feel structured and calendar-like, even without a full calendar.

Recommended layout:

- top summary area
- featured upcoming events
- browse list/grid below
- filter controls for category and city

Priority information on each card:

- title
- date/time
- city / venue
- category
- cost

### 交流 View

The discussion subview should feel lighter and more conversational than the listings modules.

Recommended layout:

- top summary area
- category chips
- post feed
- compact right-side guidance / hot topics on desktop

Priority information on each card:

- title
- category
- short excerpt
- author
- reply count
- publish time

## Moderation and Safety

Because community features increase abuse risk, moderation should be designed from the beginning.

MVP moderation rules:

- only logged-in users can create posts, replies, or events
- owners can edit/delete their own content
- admins can hide/remove any content
- users can report events, posts, and replies
- hidden/removed content should not appear in public feeds

This should reuse existing moderation patterns where possible instead of inventing a separate moderation system.

## Technical Recommendation

### Backend

Follow the existing storage pattern used by listings:

- keep API handlers thin
- add storage helpers by domain
- reuse auth / ownership checks
- reuse moderation concepts

Recommended tables:

1. `community_events`
2. `community_posts`
3. `community_post_replies`

Optional later:

4. `community_reports`

If practical, reports can also be folded into the existing listing reporting model later, but MVP can start with a separate reporting mechanism if reuse is awkward.

### Frontend

Recommended page/component structure:

- `CommunityTab.jsx`
- `CommunitySidebar.jsx` or internal top filter controls
- `EventsView.jsx`
- `CommunityFeedView.jsx`
- `EventCard.jsx`
- `EventDetailModal.jsx`
- `EventFormModal.jsx`
- `PostCard.jsx`
- `PostDetailModal.jsx`
- `PostFormModal.jsx`
- `ReplyComposer.jsx`

## Delivery Progress

Completed so far:

1. `T-COM-01` Schema + storage
2. `T-COM-02` Community API endpoints
3. `T-COM-03` Frontend shell, navigation, and community entry
4. `T-COM-04` Events MVP: publish, detail, edit, delete
5. `T-COM-05` Discussion MVP: publish, detail, replies, edit, delete
6. `T-COM-06` Community filters: category and city filters for events and posts

Deferred to a later moderation/polish phase:

- report actions for events, posts, and replies
- pinned or featured community content

The visual direction should be warmer and more social than `葡萄牙新闻`, but cleaner than a noisy forum.

## Delivery Plan

### Task 1 — T-COM-01: Schema + storage

Add backend persistence for:

- community events
- discussion posts
- replies

Storage helpers should support:

- create
- list
- get single
- update
- delete / hide

### Task 2 — T-COM-02: API endpoints

Events:

- `GET /api/community/events`
- `GET /api/community/events/{id}`
- `POST /api/community/events`
- `PUT /api/community/events/{id}`
- `DELETE /api/community/events/{id}`

Posts:

- `GET /api/community/posts`
- `GET /api/community/posts/{id}`
- `POST /api/community/posts`
- `PUT /api/community/posts/{id}`
- `DELETE /api/community/posts/{id}`

Replies:

- `GET /api/community/posts/{id}/replies`
- `POST /api/community/posts/{id}/replies`
- `DELETE /api/community/replies/{id}`

Note:

- community reporting is intentionally deferred to `Task 6 — moderation and polish`
- this keeps the first API milestone focused on browse/create/update/delete flows

### Task 3 — T-COM-03: Frontend shell integration

- add `社区` top-level tab
- add mobile navigation item
- add internal segment switch for `活动 | 交流`
- update home page to preview community content later if desired

### Task 4 — T-COM-04: 活动 view

- build event list page
- build event cards
- build detail modal
- build create/edit modal
- add category and city filters

### Task 5 — T-COM-05: 交流 view

- build post feed
- build post detail modal
- build create/edit modal
- build flat reply list + reply composer
- show reply counts in feed

### Task 6 — T-COM-06: moderation and polish

- owner/admin actions
- reporting
- hidden/removed content handling
- empty states
- loading states

## Recommended Build Order

If implemented sequentially, I recommend:

1. events backend + events frontend
2. community shell + tab integration
3. posts backend + post feed
4. replies
5. moderation and polish

This order gives the fastest user-visible value and keeps risk under control.

## MVP Success Criteria

The MVP is successful if:

- users can publish and browse events
- users can publish and browse community posts
- users can reply to posts
- owners can manage their own content
- admins can moderate content
- the module feels consistent with the current platform

## Recommendation

Proceed with `社区` as one top-level module containing:

- `活动`
- `交流`

Build `活动` first, then `交流`.

This keeps the launch practical while still establishing the long-term community direction of the platform.
