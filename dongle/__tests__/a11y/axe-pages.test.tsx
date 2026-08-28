import "@testing-library/jest-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@/__tests__/lib/axe-matchers";
import { testA11y, getAllFocusableElements } from "@/__tests__/lib/a11y-test-helpers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FormField } from "@/components/ui/FormField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { SelectField } from "@/components/ui/SelectField";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ReviewList } from "@/components/reviews/ReviewList";
import { mockProjects } from "@/data/mockProjects";
import { CATEGORY_FORM_OPTIONS, PROJECT_CATEGORIES } from "@/types/project";
import { REVIEW_CONSTRAINTS } from "@/types/review";
import React from "react";

const wrapInLayout = (children: React.ReactNode, pageTitle: string) => (
  <div>
    <a href="#main" className="sr-only focus:not-sr-only">
      Skip to main content
    </a>
    <header role="banner" aria-label="Site header">
      <a href="/" aria-label="Home - Dongle directory">
        DONGLE
      </a>
      <nav aria-label="Primary">
        <a href="/discover">Discover</a>
        <a href="/reviews">Reviews</a>
        <a href="/verify">Verify</a>
        <a href="/projects/new">Submit Project</a>
      </nav>
    </header>
    <main id="main" role="main" tabIndex={-1} aria-label={`${pageTitle} page content`}>
      {children}
    </main>
    <footer role="contentinfo" aria-label="Site footer">
      <p>&copy; 2025 Dongle directory</p>
    </footer>
  </div>
);

describe("axe-core - Page-Level Accessibility (WCAG AA)", () => {
  it("Home/Landing page passes axe-core WCAG AA checks", async () => {
    await testA11y(
      wrapInLayout(
        <>
          <section aria-labelledby="hero-heading" className="py-16">
            <h1 id="hero-heading">Discover Quality Stellar & Soroban Apps</h1>
            <p className="text-lg">
              The community-curated directory of projects building on Stellar and Soroban.
            </p>
            <div className="flex gap-3">
              <Button variant="primary" size="lg">
                Browse Directory
              </Button>
              <Button variant="outline" size="lg">
                Submit a Project
              </Button>
            </div>
          </section>
          <section aria-labelledby="features-heading">
            <h2 id="features-heading">Why use Dongle?</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { t: "Verified", d: "Projects verified by our admin team." },
                { t: "Reviewed", d: "Community reviews from real users." },
                { t: "Open", d: "Open source, always free to browse." },
              ].map((f) => (
                <Card key={f.t} variant="default">
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </Card>
              ))}
            </div>
          </section>
        </>,
        "Home",
      ),
    );
  });

  it("Discover page with filters passes axe-core checks", async () => {
    await testA11y(
      wrapInLayout(
        <>
          <h1>Discover Projects</h1>
          <section aria-label="Filters" className="mb-8">
            <div className="flex flex-wrap gap-4">
              <FormField
                id="search-q"
                label="Search"
                placeholder="Search by name or tag"
                helperText="Search across all projects"
              />
              <SelectField
                id="filter-category"
                label="Category"
                options={[
                  { value: "All", label: "All categories" },
                  ...CATEGORY_FORM_OPTIONS,
                ]}
                value="All"
                onChange={() => {}}
              />
              <SelectField
                id="sort-by"
                label="Sort by"
                options={[
                  { value: "rating", label: "Top rated" },
                  { value: "popular", label: "Most reviewed" },
                  { value: "newest", label: "Newest" },
                ]}
                value="rating"
                onChange={() => {}}
              />
            </div>
          </section>
          <section aria-label="Project list" aria-live="polite">
            <h2 className="sr-only">Matching projects</h2>
            <ul className="grid grid-cols-2 gap-4">
              {mockProjects.slice(0, 4).map((p) => (
                <li key={p.id}>
                  <Card>
                    <h3>{p.name}</h3>
                    <p>{p.primaryCategory}</p>
                    <Badge variant="default">Rating: {p.rating.toFixed(1)}</Badge>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        </>,
        "Discover projects",
      ),
    );
  });

  it("Project Detail page with reviews passes axe", async () => {
    const project = mockProjects[0];
    await testA11y(
      wrapInLayout(
        <>
          <article aria-labelledby="project-title">
            <header>
              <Badge variant="success" aria-label="Verification status: verified">
                Verified
              </Badge>
              <h1 id="project-title">{project.name}</h1>
              <p className="text-lg">{project.description}</p>
            </header>
            <section aria-labelledby="info-heading" className="my-8">
              <h2 id="info-heading">Project details</h2>
              <dl>
                <dt>Category</dt>
                <dd>{project.primaryCategory}</dd>
                <dt>Rating</dt>
                <dd>{project.rating.toFixed(1)} / 5 ({project.reviews} reviews)</dd>
                {project.websiteUrl && (
                  <>
                    <dt>Website</dt>
                    <dd>
                      <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer">
                        {project.websiteUrl}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </dd>
                  </>
                )}
              </dl>
            </section>
            <section aria-labelledby="review-form-heading">
              <h2 id="review-form-heading">Write a review</h2>
              <form aria-label="Submit review for project">
                <fieldset>
                  <legend>Your rating (1-5 stars)</legend>
                  <div role="radiogroup" aria-label="Rating selection">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className="mr-3">
                        <input type="radio" name="rating" value={n} /> <span>{n} stars</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <TextAreaField
                  id="review-body"
                  label={`Your review of ${project.name}`}
                  placeholder={`Share your experience with ${project.name}`}
                  rows={4}
                />
                <Button type="submit">Submit review</Button>
              </form>
            </section>
            <section aria-labelledby="reviews-heading">
              <h2 id="reviews-heading">
                Recent reviews ({project.reviews})
              </h2>
              <ul className="space-y-4">
                {[
                  { user: "User A", rating: 5, body: "Excellent project, easy to use and very reliable API." },
                  { user: "User B", rating: 4, body: "Great work overall, could improve the UI details." },
                ].map((r, i) => (
                  <li key={i}>
                    <Card padding="sm">
                      <div>
                        <strong>{r.user}</strong>
                        <Badge variant="default" aria-label={`Rated ${r.rating} out of 5 stars`}>
                          {r.rating}/5
                        </Badge>
                      </div>
                      <p>{r.body}</p>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          </article>
        </>,
        "Project detail",
      ),
    );
  });

  it("Submit Project form page passes axe-core checks", async () => {
    await testA11y(
      wrapInLayout(
        <>
          <h1>Submit a new project</h1>
          <p className="text-zinc-600">
            Share your Stellar or Soroban project with the community. All fields marked with
            <span aria-hidden="true"> *</span>
            <span className="sr-only">asterisk symbol</span> are required.
          </p>
          <form aria-label="Project submission form" className="space-y-6 max-w-2xl">
            <FormField
              id="project-name"
              label="Project name"
              placeholder="My Awesome Project"
              helperText="Must be at least 3 characters. Visible in the directory listing."
              required
              maxLength={80}
            />
            <SelectField
              id="project-category"
              label="Primary category"
              options={CATEGORY_FORM_OPTIONS}
              value="defi"
              onChange={() => {}}
              helperText="Pick the most relevant category. You can add more details in tags."
            />
            <TextAreaField
              id="project-description"
              label="Project description"
              placeholder="What does this project do and who is it for?"
              rows={5}
              helperText={`Minimum ${REVIEW_CONSTRAINTS.COMMENT_MIN_LENGTH} characters.`}
              maxLength={1000}
            />
            <FormField
              id="project-url"
              label="Website URL"
              type="url"
              placeholder="https://example.com"
              required
            />
            <FormField
              id="project-github"
              label="GitHub repository URL"
              type="url"
              placeholder="https://github.com/your/project"
            />
            <FormField
              id="project-docs"
              label="Documentation URL"
              type="url"
              placeholder="https://docs.example.com"
            />
            <div className="flex gap-3">
              <Button type="submit" variant="primary">
                Submit project
              </Button>
              <Button type="button" variant="ghost">
                Save as draft
              </Button>
            </div>
          </form>
        </>,
        "Submit project",
      ),
    );
  });

  it("Verify / Verification page passes axe checks", async () => {
    await testA11y(
      wrapInLayout(
        <>
          <h1>Verify Project Ownership</h1>
          <p>
            Prove you own or maintain a listed project to unlock the verified badge and update
            controls.
          </p>
          <Card>
            <h2>Choose a verification method</h2>
            <ol className="list-decimal pl-6">
              <li>
                <h3>Website meta tag</h3>
                <p>
                  Add a <code>&lt;meta&gt;</code> tag to your project homepage.
                </p>
              </li>
              <li>
                <h3>GitHub repository</h3>
                <p>Add a file to the default branch of the linked GitHub repo.</p>
              </li>
              <li>
                <h3>Admin review</h3>
                <p>
                  If the above methods don't apply, request manual review.
                </p>
              </li>
            </ol>
            <form aria-label="Website verification form" className="mt-6 space-y-4 max-w-lg">
              <FormField
                id="verify-project-id"
                label="Project identifier"
                placeholder="project-slug"
                helperText="The short slug in the project page URL."
              />
              <FormField
                id="verify-token"
                label="Verification token"
                placeholder="XXXXXXXX-XXXX-XXXX"
              />
              <Button type="submit">Verify project</Button>
            </form>
          </Card>
        </>,
        "Verify project",
      ),
    );
  });

  it("Reviews listing page passes axe with sort/filter controls", async () => {
    await testA11y(
      wrapInLayout(
        <>
          <h1>Community Reviews</h1>
          <section aria-label="Review filters">
            <div className="flex flex-wrap gap-4 items-end">
              <SelectField
                id="reviews-sort"
                label="Sort reviews"
                options={[
                  { value: "newest", label: "Newest first" },
                  { value: "helpful", label: "Most helpful" },
                  { value: "rating-desc", label: "Highest rated" },
                  { value: "rating-asc", label: "Lowest rated" },
                ]}
                value="newest"
                onChange={() => {}}
              />
              <SelectField
                id="reviews-rating"
                label="Filter by rating"
                options={[
                  { value: "0", label: "Any rating" },
                  { value: "5", label: "5 stars only" },
                  { value: "4", label: "4 stars and above" },
                ]}
                value="0"
                onChange={() => {}}
              />
            </div>
          </section>
          <section aria-labelledby="review-list-heading" aria-live="polite">
            <h2 id="review-list-heading" className="sr-only">
              Filtered review list
            </h2>
            <ul className="space-y-4 max-w-3xl">
              {mockProjects.slice(0, 3).map((p) => (
                <li key={p.id}>
                  <article aria-label={`Review of ${p.name}`}>
                    <Card padding="md">
                      <div className="flex items-center justify-between">
                        <h3>{p.name}</h3>
                        <Badge variant="success">
                          {p.rating.toFixed(1)} / 5
                        </Badge>
                      </div>
                      <p>{p.description.substring(0, 120)}...</p>
                      <footer>
                        <small>
                          Reviewer: Wallet <code>GAbc...XYZ</code>
                        </small>
                      </footer>
                    </Card>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        </>,
        "Reviews listing",
      ),
    );
  });

  it("Admin dashboard layout passes axe-core checks", async () => {
    await testA11y(
      wrapInLayout(
        <>
          <h1>Admin Dashboard</h1>
          <section aria-label="Stats" className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: "Pending verifications", value: 12 },
              { label: "Open reports", value: 3 },
              { label: "Projects this week", value: 8 },
              { label: "Moderation queue", value: 5 },
            ].map((s) => (
              <Card key={s.label} padding="sm">
                <p className="text-sm text-zinc-500">{s.label}</p>
                <p className="text-3xl font-bold" aria-label={`${s.value} ${s.label}`}>
                  {s.value}
                </p>
              </Card>
            ))}
          </section>
          <section aria-labelledby="queue-heading">
            <h2 id="queue-heading">Verification queue</h2>
            <table aria-describedby="queue-desc">
              <caption id="queue-desc" className="sr-only">
                Verification requests awaiting review.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Submitted by</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Project A</th>
                  <td>GAbc...123</td>
                  <td>2 hours ago</td>
                  <td>
                    <Badge variant="warning">Pending</Badge>
                  </td>
                  <td>
                    <Button size="sm">Review</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </>,
        "Admin dashboard",
      ),
    );
  });

  it("Page structure: semantic headings, landmarks, and skip links are valid", async () => {
    render(
      wrapInLayout(
        <>
          <section aria-labelledby="sec-a">
            <h1 id="sec-a">Main heading</h1>
            <p>Intro</p>
            <h2>Sub heading 1</h2>
            <p>Content under sub-1</p>
            <section aria-labelledby="nested">
              <h3 id="nested">Nested</h3>
              <p>Body of nested section</p>
            </section>
          </section>
        </>,
        "Structured",
      ),
    );

    const main = document.querySelector<HTMLElement>("main");
    expect(main).toBeInTheDocument();
    expect(main?.getAttribute("role")).toBe("main");
    expect(main?.getAttribute("aria-label")).toMatch(/structured/i);

    const h1 = document.querySelectorAll("h1");
    expect(h1.length).toBe(1);

    const skipLink = screen.getByRole("link", { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();

    const banner = document.querySelectorAll('[role="banner"], header');
    const contentInfo = document.querySelectorAll('[role="contentinfo"], footer');
    expect(banner.length).toBeGreaterThan(0);
    expect(contentInfo.length).toBeGreaterThan(0);
  });

  it("form controls have programmatically-associated labels page-wide", async () => {
    render(
      wrapInLayout(
        <form aria-label="Combined form">
          <FormField id="a" label="Full name" />
          <FormField id="b" label="Contact email" type="email" />
          <SelectField
            id="c"
            label="Country"
            options={[{ value: "us", label: "United States" }]}
            value="us"
            onChange={() => {}}
          />
          <TextAreaField id="d" label="Additional notes" rows={3} />
          <Button type="submit">Save</Button>
        </form>,
        "Forms",
      ),
    );

    const inputs = Array.from(document.querySelectorAll("input, select, textarea")) as (
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    )[];

    for (const control of inputs) {
      if (!control.id || control.type === "hidden") continue;
      const labelled =
        control.getAttribute("aria-label")?.trim().length ||
        control.getAttribute("aria-labelledby")?.trim().length ||
        document.querySelector(`label[for="${control.id}"]`);
      expect(labelled, `Control #${control.id} missing accessible label`).toBeTruthy();
    }
  });
});
