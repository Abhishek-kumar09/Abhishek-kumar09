# Builds README.md: a terminal transcript in <pre> blocks (GitHub keeps <a>/<b>
# inside <pre>, so links survive) with column padding measured on visible text.
import html, re

import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "README.md")
GH = "https://github.com"
ME = "Abhishek-kumar09"

def a(text, href):
    return f'<a href="{href}">{html.escape(text)}</a>'

def prs(repo):
    return f"{GH}/{repo}/pulls?q=is%3Apr+author%3A{ME}+is%3Amerged+sort%3Aupdated-desc"

def vis_len(s):
    return len(html.unescape(re.sub(r"<[^>]+>", "", s)))

def pad(s, width):
    return s + " " * max(0, width - vis_len(s))

PROMPT = '<b>abhishek@github</b>:<b>~</b>$ '

def cmd(c):
    return PROMPT + html.escape(c)

def block(lines):
    return "<pre>\n" + "\n".join(lines) + "\n</pre>"

# ---------------------------------------------------------------- journey
J = [
    ("2025–26", "cyborg-ai/",    "https://getcyborg.ai/",                 "Founding & Infra Engineer", "double digits → $250K ARR, 100% uptime"),
    ("2023–24", "creatr/",       "https://getcreatr.com/",                "Co-founder & CTO",          "$1.2M raised · 3 launches · 80k+ users"),
    ("2022–23", "meshery/",      f"{GH}/meshery/meshery",                 "SWE · Layer5",              "built & shipped MeshMap · Intel tooling"),
    ("2021–22", "openebs/",      "https://mentorship.lfx.linuxfoundation.org/project/64e3add3-060b-4ffa-9408-1289e2f2fdc5", "LFX Mentee · CNCF", "openebsctl: upgrade jobs, all CAS types"),
    ("2021",    "gsoc/",         "https://summerofcode.withgoogle.com/archive/2021/organizations/5722851356704768", "GSoC Mentor · JBoss", "2 students · education platform + app"),
    ("2021",    "mlh/",          "https://fellowship.mlh.io/",            "MLH Fellow · Explorer",     "12 weeks, a new product every two"),
    ("2020–21", "codeforcause/", "https://www.youtube.com/c/CodeforCause", "SWE & Mentor",             "500+ students · podcasts with OSS orgs"),
    ("2020–21", "checkstyle/",   f"{GH}/checkstyle/checkstyle",           "Open-source Developer",     "rewrote Indentation · used by millions"),
    ("2019–20", "segura/",       f"{GH}/{ME}/Segura",                     "Flutter Developer",         "client + server for a luggage service"),
]
journey = [cmd("ls -la ~/journey --sort=time"), f"total {len(J) + 1}"]
for years, d, href, role, note in J:
    journey.append("drwxr-xr-x  " + pad(years, 9) + pad(a(d, href), 14) + pad(html.escape(role), 27) + html.escape(note))
journey.append("lrwxrwxrwx  " + pad("2018–22", 9) + "mait-delhi -&gt; B.Tech, Computer Science · MAIT Delhi")

def logo(name, href, h, alt):
    return (f'<a href="{href}"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/{name}-dark.svg">'
            f'<img src="assets/{name}-light.svg" height="{h}" alt="{alt}"></picture></a>')

investors = [
    cmd("cat ~/journey/creatr/investors"),
    logo("accel", "https://www.accel.com/", 24, "Accel") + "      " + logo("allin", "https://allincapital.vc/", 30, "All In Capital"),
]

# ------------------------------------------------------------ open source
oss = [
    cmd("git log --graph --oneline --author=abhishek upstream/"),
    "* " + a("meshery/meshery", prs("meshery/meshery")) + "         168 PRs merged · 835 commits · " + a("#14 of 300+ contributors", f"{GH}/meshery/meshery/graphs/contributors") + " · 11.5k★",
    "│ ├ MeshMap — design configurator, MeshModel, OPA policy engine, GraphQL subscriptions, RJSF forms",
    "│ └ " + a("meshery-extensions", f"{GH}/pulls?q=is%3Apr+author%3A{ME}+is%3Amerged+org%3Ameshery-extensions") + " — 50+ PRs: Cypress e2e suite, MeshMap snapshot service, Traefik Mesh",
    "* " + a("checkstyle/checkstyle", prs("checkstyle/checkstyle")) + "   28 PRs merged · 9k★ · a linter used by millions of developers",
    "│ ├ Indentation re-implemented: " + a("lambdas", f"{GH}/checkstyle/checkstyle/pull/8719") + ", " + a("annotation arrays", f"{GH}/checkstyle/checkstyle/pull/8083") + ", " + a("non-list block children", f"{GH}/checkstyle/checkstyle/pull/8217"),
    "│ └ then fixed the fallout downstream: " + a("pgjdbc", f"{GH}/pgjdbc/pgjdbc/pull/2024") + " ×2 · " + a("PMD", f"{GH}/pmd/pmd/pull/2925") + " · " + a("XWiki", f"{GH}/xwiki/xwiki-commons/pull/117"),
    "* " + a("openebs/openebsctl", prs("openebs-archive/openebsctl")) + "      11 PRs merged · #3 contributor · Linux Foundation / CNCF",
    "│ └ upgrade jobs for Jiva & CSPC pools, log streams, local-hostpath volumes",
    "* " + a("codeforcause", f"{GH}/pulls?q=is%3Apr+author%3A{ME}+is%3Amerged+org%3Acodeforcauseorg") + "            80+ PRs merged · #1 contributor · org site · " + a("edu-server", f"{GH}/codeforcauseorg/edu-server") + " · " + a("edu-client", f"{GH}/codeforcauseorg/edu-client"),
    "│",
    "* " + a("461 merged pull requests", f"{GH}/pulls?q=is%3Apr+author%3A{ME}+is%3Amerged") + " · " + a("545 reviewed", f"{GH}/pulls?q=is%3Apr+reviewed-by%3A{ME}") + " · 9.6k contributions, and counting",
]

# ---------------------------------------------------------------- honours
ok = "[  <b>OK</b>  ] "
honours = [
    cmd("journalctl -b --grep=honours"),
    ok + "Reached target Linux Foundation Scholarship — 1 of 500 selected worldwide.",
    ok + "Started " + a("Google Summer of Code", "https://summerofcode.withgoogle.com/archive/2021/organizations/5722851356704768") + " mentor — JBoss Community, 2021.",
    ok + "Started " + a("Major League Hacking Fellowship", "https://fellowship.mlh.io/") + " — Explorer track, 2021.",
    ok + "Started " + a("LFX Mentorship", "https://mentorship.lfx.linuxfoundation.org/project/64e3add3-060b-4ffa-9408-1289e2f2fdc5") + " — OpenEBS · CNCF, 2021–22.",
    ok + "Finished Devpost &amp; MLH hackathons — winner.",
    ok + "Activated Google Cloud Badge Practitioner.",
    ok + "Delivered 10+ technical workshops across colleges in India.",
    ok + "Listening on " + a("Product Hunt", "https://www.producthunt.com/products/bloq-by-creatr") + " — Bloq by Creatr, 2024.",
]

# ---------------------------------------------------------------- contact
N = [
    ("linkedin.com",      "abhishek-kr09",          "https://www.linkedin.com/in/abhishek-kr09/",   ""),
    ("x.com",             "Abhi_dev_dude",          "https://twitter.com/Abhi_dev_dude",            ""),
    ("producthunt.com",   "abhishek1909",           "https://www.producthunt.com/@abhishek1909",     "# 3 launches"),
    ("stackoverflow.com", "aks",                    "https://stackoverflow.com/users/11966205/aks", "# users/11966205"),
    ("youtube.com",       "CodeforCause",           "https://www.youtube.com/c/CodeforCause",       "# live podcasts with open-source orgs"),
    ("mail",              "abhimait1909@gmail.com", "mailto:abhimait1909@gmail.com",                "# the fastest route"),
]
contact = [cmd("cat ~/.netrc")]
for machine, login, href, note in N:
    contact.append("machine " + pad(machine, 20) + "login " + pad(a(login, href), 24) + note)

finger = [
    cmd("finger abhishek"),
    pad("Login: abhishek", 40) + "Name: Abhishek Kumar",
    pad("Directory: /home/delhi", 40) + "Shell: /bin/zsh",
    pad("Last login: just now, from a terminal", 40) + "Mail: " + a("abhimait1909@gmail.com", "mailto:abhimait1909@gmail.com"),
    "Plan:",
    "  I take products from the first commit to revenue — and keep them standing.",
    "  Founding &amp; infra engineer across full-stack product, infrastructure and AI.",
    "  Previously co-founder &amp; CTO at Creatr AI, engineer on Meshery at Layer5,",
    "  Linux Foundation / CNCF mentee at OpenEBS, Google Summer of Code mentor.",
]

exit_ = [cmd("exit"), "logout", "Connection to github.com closed."]

def picture(name, alt):
    return (f'<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="assets/{name}-dark.svg">\n'
            f'  <img alt="{alt}" src="assets/{name}-light.svg" width="100%">\n</picture>')

readme = "\n\n".join([
    "<!-- Rendered by scripts/render.mjs; the numbers refresh daily via GitHub Actions. -->",
    picture("neofetch", "neofetch — Abhishek Kumar, Founding & Infra Engineer. 461 PRs merged, 545 reviews, 9.6k contributions. 80k+ users, $1.2M raised, $250K ARR."),
    block(finger),
    block(journey),
    block(investors),
    block(oss),
    picture("htop", "htop — the stack: TypeScript, Node.js, React, Kubernetes, Docker, Google Cloud, Firebase, Figma Plugin API, AI systems, Go, Bash, Flutter, Java/Checkstyle."),
    block(honours),
    block(contact),
    block(exit_),
]) + "\n"
open(OUT, "w").write(readme)
print(f"wrote {os.path.normpath(OUT)}")
