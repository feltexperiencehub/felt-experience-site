#!/usr/bin/env python3
"""Generates the static pages. Content lives here; edit this, then run `python3 build.py`."""
import pathlib
ROOT = pathlib.Path(__file__).parent

import hashlib
def asset(path):
    """/assets/x.jpg?v=<hash> — long-cached but busts when the file changes."""
    f = ROOT / path.lstrip('/')
    h = hashlib.sha1(f.read_bytes()).hexdigest()[:8] if f.exists() else '0'
    return path + '?v=' + h

SITE  = "Felt Experience Poker"
TG    = "https://t.me/feltexperience"
YT    = "https://youtube.com/@feltexperiencepoker"
APPLY = "https://apply.feltexperiencepoker.com"
REPLAY= "https://replayer.feltexperiencepoker.com"
STRIPE= "https://buy.stripe.com/9B68wQ2I35lq2YIgFW5kk01"
MAIL  = "feltexperiencepoker@gmail.com"

NAV = [(YT,"YouTube"),("coaching.html","Coaching"),("staking.html","Staking"),
       ("clubs.html","Clubs"),("tools.html","Tools"),(REPLAY,"Replayer")]

def url_for(page):
    """coaching.html -> /coaching ; index.html -> / ; 404 keeps its filename."""
    if page.startswith('http'): return page
    if page == 'index.html': return '/'
    if page == '404.html':   return '/404.html'
    return '/' + page[:-len('.html')]

def shell(page, title, desc, body):
    parts = []
    for h, t in NAV:
        cls = ' class="on"' if h == page else ''
        ext = ' target="_blank" rel="noopener"' if h.startswith('http') else ''
        hide = ' class="hide-mobile"' if t == 'Replayer' and not cls else ''
        if hide and cls: hide = ''
        parts.append('<a href="' + url_for(h) + '"' + (cls or hide) + ext + '>' + t + '</a>')
    links = "".join(parts)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<meta name="description" content="{desc}" />
{'<meta name="robots" content="noindex" />' if page == '404.html' else '<link rel="canonical" href="https://feltexperiencepoker.com' + url_for(page) + '" />'}
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:type" content="website" />
<link rel="icon" href="{asset("/assets/favicon.svg")}" type="image/svg+xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/styles.css" />
</head>
<body>
<nav><div class="wrap nav-in">
  <a class="mark" href="/"><b>FELT</b> EXPERIENCE</a>
  <div class="nav-links">{links}</div>
</div></nav>
{body}
<div class="wrap"><footer>
  <div class="foot-contact">
    <div class="colhead">Get in touch</div>
    <div class="foot-line">Telegram: <a href="{TG}" target="_blank" rel="noopener">@feltexperience</a></div>
    <div class="foot-line">Discord: feltexperience</div>
    <div class="foot-line">Email: <a href="mailto:{MAIL}">{MAIL}</a></div>
  </div>
  <div class="foot-meta">
    <div class="c">&copy; {SITE}</div>
  </div>
</footer></div>
</body>
</html>
"""

RULE = '<div class="rule"><span>&#9824;</span><i></i></div>'

# ---------------------------------------------------------------- home
home = f"""
<div class="wrap hero">
  <h1>Solvers tell you what's correct.<br/><span class="g">Understanding why is how you make money.</span></h1>
  <p class="lede">I'm Dustin. I've played online poker professionally since 2007, and currently play up
     to 10/20 NL. Every week I break down real hands on YouTube, including the ones I got wrong.</p>
  <div class="cta">
    <a class="btn p" href="{YT}" target="_blank" rel="noopener">Watch on YouTube</a>
    <a class="btn s" href="/coaching">Work with me</a>
  </div>
</div>

<div class="band"><div class="wrap">
  {RULE.replace('margin','margin')}
  <div class="eyebrow">Free tool</div>
  <h2>Step through a hand right now</h2>
  <p class="sub">My hand replayer is free and needs no signup. Paste a hand history from PokerStars,
     GGPoker, ACR, Ignition, or ClubGG, or manually create your own, and walk through it street by street.</p>
  <a class="shot" href="{REPLAY}" target="_blank" rel="noopener">
    <img src="{asset("/assets/replayer.jpg")}" width="1500" height="843"
         alt="The Felt Experience hand replayer showing a turn spot in a six-handed cash game" />
  </a>
  <div class="after">
    <span>Shared links unfurl into a picture of the hand, so you can post spots anywhere.</span>
    <a class="btn s" href="{REPLAY}" target="_blank" rel="noopener">Open the replayer &rarr;</a>
  </div>
</div></div>

<div class="wrap doors">
  <div class="door">
    <div class="k">Learn</div><h3>Free strategy</h3>
    <p>Weekly play-and-explains, solver reviews and hand breakdowns. Start here if you don't know me yet.</p>
    <a href="{YT}" target="_blank" rel="noopener">Watch on YouTube &rarr;</a>
  </div>
  <div class="door">
    <div class="k">Work with me</div><h3>Coaching</h3>
    <p>One-on-one sessions built around your game, or a monthly group at a lower commitment.</p>
    <a href="/coaching">Coaching &rarr;</a>
  </div>
  <div class="door">
    <div class="k">Get staked</div><h3>Staking &amp; CFP</h3>
    <p>Play on my bankroll, or apply for coaching-for-profits and keep playing on your own roll.</p>
    <a href="/staking">Staking &rarr;</a>
  </div>
  <div class="door">
    <div class="k">Play</div><h3>Club access</h3>
    <p>Selected ClubGG and PokerBros clubs for players and agents, with rakeback arrangements.</p>
    <a href="/clubs">Club info &rarr;</a>
  </div>
</div>

<div class="wrap">
  {RULE}
  <div class="eyebrow">What viewers say</div>
  <div class="quotes">
    <blockquote class="qcard">
      <p>This is probably the best solver/study based video I've ever watched, and I've been
         watching training videos since the CTS/Stinger days.</p>
      <p>Very dense material, but extremely valuable and well explained.</p>
      <cite>@younggunz20</cite>
    </blockquote>
    <blockquote class="qcard">
      <p>Great video! These are by far the best poker contents out there, so I have to thank you
         so much for doing them!</p>
      <cite>@hefestisllove6056</cite>
    </blockquote>
    <blockquote class="qcard">
      <p>Very underrated channel with great content. Looking forward to the next one</p>
      <cite>@sauceboss4895</cite>
    </blockquote>
    <blockquote class="qcard">
      <p>Your stuff just keeps getting better, easily my favourite channel atm</p>
      <cite>@pokerinfobot</cite>
    </blockquote>
    <blockquote class="qcard">
      <p>Perhaps the best poker content there is available for free.</p>
      <cite>@sachaalter851</cite>
    </blockquote>
  </div>
  <div class="attrib">From the comments on the <a href="{YT}" target="_blank" rel="noopener">Felt Experience Poker</a> channel</div>
</div>
"""

# ---------------------------------------------------------------- coaching
coaching = f"""
<div class="wrap hero" style="padding-bottom:40px">
  <div class="eyebrow">Coaching</div>
  <h1 style="margin-top:14px">Two ways to work with me</h1>
  <p class="lede">Both are built on the same thing: solver-informed heuristics crossed with what the
     player pool actually does. Pick whichever fits the level of individual attention you're
     looking for.</p>
</div>

<div class="wrap fork">
  <div class="path">
    <div class="who">Start here</div>
    <h2>Coaching Group</h2>
    <div class="price">$149 / month &middot; cancel anytime</div>
    <p>Monthly live group coaching calls, an active Discord server to discuss hands with myself
       and other winning players, and every past recording. The lowest-commitment way to see whether
       the way I think helps your game.</p>
    <a class="btn s" href="{STRIPE}" target="_blank" rel="noopener">Join the group</a>
  </div>
  <div class="path hi">
    <div class="who">Most direct</div>
    <h2>1-on-1 Coaching</h2>
    <div class="price">From $625</div>
    <p>Your database, your hands, your leaks. For serious 50NL&ndash;1kNL players who want the spots
       costing them money found and fixed rather than explained in general.</p>
    <a class="btn p" href="{TG}" target="_blank" rel="noopener">Ask about 1-on-1</a>
  </div>
</div>

<div class="wrap">
  {RULE}
  <h2>1-on-1 Coaching</h2>
  <p class="sub">Sessions are built around your game. We often start by diving into your database
     to find your biggest leaks. The plan is different for each player.</p>

  <div class="cols">
    <div>
      <div class="colhead">What sessions can cover</div>
      <ul class="ticks">
        <li>Database and leak analysis</li>
        <li>Hand-history review</li>
        <li>Solver study and interpretation</li>
        <li>Strategic heuristics and study planning</li>
        <li>Population tendencies and exploits</li>
      </ul>
    </div>
  </div>

  <div class="pkg-note">Every session is <b>75 minutes</b></div>
  <div class="cards">
    <div class="card">
      <div class="tier">2 Sessions</div><div class="count">Minimum booking</div>
      <div class="money"><div class="price2">$625</div><div class="per">$312.50 per session</div></div>
    </div>
    <div class="card s">
      <div class="tier">Silver Package</div><div class="count">5 sessions</div>
      <div class="money"><div class="price2">$1,500</div><div class="per">$300 per session</div></div>
    </div>
    <div class="card g">
      <div class="tier">Gold Package</div><div class="count">10 sessions</div>
      <div class="money"><div class="price2">$2,750</div><div class="per">$275 per session</div>
        <div class="extra">Includes 6 months in my private Discord group with monthly live calls and
          ongoing hand discussions</div></div>
    </div>
  </div>
  <div class="mid"><a class="btn p" href="{TG}" target="_blank" rel="noopener">Ask about 1-on-1 coaching &rarr;</a></div>

  {RULE}
  <h2>The Coaching Group</h2>
  <p class="sub">A private group for players who want a more direct and personalized way to improve,
     without booking individual sessions.</p>
  <div class="grp">
    <div>
      <div class="colhead">Includes</div>
      <ul class="ticks">
        <li>Monthly live group coaching</li>
        <li>Private Discord study group</li>
        <li>Access to all past group coaching recordings</li>
        <li>One personalized database review when you join</li>
        <li>Access to custom HUDs and pop-ups</li>
      </ul>
    </div>
    <div>
      <div class="p">$149<small> / month</small></div>
      <div class="fine">Cancel anytime. Once you sign up you'll be emailed an invite link within
        one business day.</div>
      <a class="btn s" style="margin-top:20px" href="{STRIPE}" target="_blank" rel="noopener">Join the group</a>
    </div>
  </div>

  <div class="about">
    <div><div class="colhead">About me</div></div>
    <div><p>I've played online poker professionally since 2007 and currently play up to 10/20 no-limit.
      I was a video coach for PokerStrategy and Red Chip Poker, and I run the Felt Experience Poker
      YouTube channel, where I break down real hands every week.</p></div>
  </div>
</div>
"""

# ---------------------------------------------------------------- staking
staking = f"""
<div class="wrap hero" style="padding-bottom:34px">
  <div class="eyebrow">Apply</div>
  <h1 style="margin-top:14px">Staking and coaching for profits</h1>
  <p class="lede">One application covers both programs: staking, where you play on my roll, or coaching
     for profits, where I coach you in exchange for a share of what you win while you keep playing on
     your own roll.</p>
  <p class="sub">Terms depend on stakes and volume; you will be sent a personalized offer if accepted.</p>
</div>

<div class="wrap">
  <div class="rule tight"><span>&#9824;</span><i></i></div>
  <div class="colhead">What I look for</div>
  <ul class="ticks">
    <li><b>A solid baseline</b> &ndash; you have a basic understanding of the game and your preflop frequencies are in
        reasonable shape.</li>
    <li><b>Consistent volume</b> &ndash; I'd rather back someone who plays every week than someone who
        binges once a month.</li>
    <li><b>A growth mindset</b> &ndash; poker is complex, and reaching the top levels takes a commitment
        to keep improving.</li>
  </ul>
  <div class="mid" style="justify-content:flex-start;margin-top:30px">
    <a class="btn p" href="{APPLY}" target="_blank" rel="noopener">Apply for staking or CFP &rarr;</a>
  </div>
</div>
"""

# ---------------------------------------------------------------- clubs
clubs = f"""
<div class="wrap hero" style="padding-bottom:34px">
  <div class="eyebrow">Play</div>
  <h1 style="margin-top:14px">Club access</h1>
  <p class="lede">I offer access to selected ClubGG and PokerBros clubs for players and agents.
     Message me on Telegram <a href="{TG}" target="_blank" rel="noopener">@feltexperience</a> for club
     information and rakeback arrangements.</p>
  <div class="cta">
    <a class="btn p" href="{TG}" target="_blank" rel="noopener">Request club info</a>
    <a class="btn s" href="/staking">Looking for a stake instead?</a>
  </div>
</div>
"""

# ---------------------------------------------------------------- tools
def tool(name, url, desc, perk=""):
    p = f' <span class="perk">{perk}</span>' if perk else ""
    return (f'<div class="tool"><div class="n">{name}</div>'
            f'<div class="d">{desc}{p}</div>'
            f'<a class="go" href="{url}" target="_blank" rel="noopener">Visit &rarr;</a></div>')

tools = f"""
<div class="wrap hero" style="padding-bottom:26px">
  <div class="eyebrow">Tools</div>
  <h1 style="margin-top:14px">What I actually use</h1>
  <p class="lede">These are the tools I use to make studying, tracking, and decision-making more
     efficient. Some links give you a discount and pay me a commission.</p>
</div>
<div class="wrap">
  {tool("Felt Experience Replayer", REPLAY, "My free poker hand replayer. No signup, works with hand histories from every major site.", "Free")}
  {tool("GTO Wizard", "https://gtowizard.com/p/feltexperience/", "Top-tier study tool with high-speed custom solving.", "10% off through this link")}
  {tool("Hand2Note", "https://hand2note.com?rid=71022", "Tracking, database, analysis and HUD software.", "Code FELT for 10% off")}
  {tool("Jurojin", "https://jurojinpoker.com/?ref=659", "Multi-tabling software with custom hotkeys, layouts, overlays, and timing tell data.", "31-day free full-access trial")}
</div>
"""


# ---------------------------------------------------------------- 404
notfound = f"""
<div class="wrap hero" style="padding-bottom:40px">
  <div class="eyebrow">404</div>
  <h1 style="margin-top:14px">That page doesn't exist</h1>
  <p class="lede">The link may be out of date, or I may have moved something. Everything on the site
     is one click away in the menu above.</p>
  <div class="cta">
    <a class="btn p" href="/">Back to the homepage</a>
    <a class="btn s" href="{REPLAY}" target="_blank" rel="noopener">Open the replayer</a>
  </div>
</div>
"""

PAGES = [
  ("index.html",   f"{SITE} – No-Limit Hold'em Cash Game Strategy",
   "Free weekly no-limit hold'em strategy, a free hand replayer, coaching, staking, and club access.", home),
  ("coaching.html", f"Poker Coaching – {SITE}",
   "One-on-one NLHE cash coaching for 50NL-1kNL players, and a $149/month coaching group.", coaching),
  ("staking.html", f"Staking & Coaching for Profits – {SITE}",
   "Apply for staking or coaching for profits with Felt Experience Poker.", staking),
  ("clubs.html",   f"Club Access – {SITE}",
   "Access to selected ClubGG and PokerBros clubs for players and agents, with rakeback.", clubs),
  ("tools.html",   f"Poker Tools I Use – {SITE}",
   "The study, tracking, and multi-tabling tools I use, including my free hand replayer.", tools),
  ("404.html",     f"Page not found – {SITE}",
   "That page doesn't exist.", notfound),
]

for page, title, desc, body in PAGES:
    (ROOT / page).write_text(shell(page, title, desc, body))
    print("wrote", page)
