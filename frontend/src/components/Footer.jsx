import { Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";

const footerLinks = {
  Product: [
    { label: "Goal Tracking", href: "#" },
    { label: "Quarterly Check-ins", href: "#" },
    { label: "Performance Scores", href: "#" },
    { label: "Team Dashboards", href: "#" },
    { label: "Manager Approvals", href: "#" },
  ],
  Company: [
    { label: "About Us", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Press Kit", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Help Center", href: "#" },
    { label: "Community", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
    { label: "Security", href: "#" },
    { label: "Compliance", href: "#" },
  ],
};

function SocialIcon({ d, label }) {
  return (
    <a
      href="#"
      className="gv-btn inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-indigo-200 transition hover:bg-white/20 hover:text-white"
      aria-label={label}
    >
      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
        <path d={d} />
      </svg>
    </a>
  );
}

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(event) {
    event.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  }

  return (
    <footer className="gv-footer text-white">
      {/* Main footer content */}
      <div className="px-6 pt-12 pb-8 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div className="space-y-5">
            <div>
              <p className="text-xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">Goal</span>
                <span>verse</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-indigo-200/70">
                Unified goal setting, tracking, and performance reviews for modern teams. Set OKRs, track progress, and drive alignment across your organization.
              </p>
            </div>

            {/* Newsletter */}
            <div>
              <p className="text-sm font-semibold text-white">Stay updated</p>
              <p className="mt-1 text-xs text-indigo-200/60">Get product updates and team insights delivered weekly.</p>
              <form onSubmit={handleSubscribe} className="mt-3 flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="h-9 flex-1 rounded-lg border border-white/15 bg-white/10 px-3 text-sm text-white placeholder-indigo-300/50 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
                  required
                />
                <button
                  type="submit"
                  className="gv-btn h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 text-xs font-semibold text-white transition hover:from-cyan-400 hover:to-indigo-400"
                >
                  Subscribe
                </button>
              </form>
              {subscribed ? (
                <p className="mt-2 text-xs text-emerald-300">✓ Thanks for subscribing!</p>
              ) : null}
            </div>

            {/* Contact info */}
            <div className="space-y-2 text-xs text-indigo-200/60">
              <p className="flex items-center gap-2"><Mail size={13} /> hello@goalverse.io</p>
              <p className="flex items-center gap-2"><Phone size={13} /> +1 (555) 123-4567</p>
              <p className="flex items-center gap-2"><MapPin size={13} /> San Francisco, CA</p>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <p className="text-sm font-semibold text-white">{category}</p>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-indigo-200/60 transition hover:text-cyan-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 px-6 py-5 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-indigo-200/50">
            © {new Date().getFullYear()} Goalverse Inc. All rights reserved. · JWT secured · PostgreSQL backed
          </p>
          <div className="flex items-center gap-2">
            {/* Twitter / X */}
            <SocialIcon
              label="Twitter"
              d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
            />
            {/* LinkedIn */}
            <SocialIcon
              label="LinkedIn"
              d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
            />
            {/* GitHub */}
            <SocialIcon
              label="GitHub"
              d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
            />
            {/* YouTube */}
            <SocialIcon
              label="YouTube"
              d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z M9.545 15.568V8.432L15.818 12l-6.273 3.568z"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
