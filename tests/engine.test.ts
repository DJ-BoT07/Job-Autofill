// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { classify, getSignals } from "../src/content/detector";
import { fillPage } from "../src/content/engine";
import { bestMatch, setNativeValue } from "../src/content/filler";
import { ProfileSchema, resolveProfile } from "../src/shared/schema";

const profile = resolveProfile(
  ProfileSchema.parse({
    firstName: "Asha",
    lastName: "Rao",
    email: "asha@example.com",
    phone: "9876543210",
    phoneCountryCode: "+91",
    city: "Pune",
    country: "India",
    linkedin: "https://linkedin.com/in/asha",
    github: "https://github.com/asha",
    degree: "Bachelor",
    workAuthorized: "Yes",
    needsSponsorship: "No",
    answers: [{ question: "why do you want", answer: "I like the product." }],
  }),
);

const generic = new URL("https://boards.greenhouse.io/acme/jobs/1");
const workdayUrl = new URL("https://acme.wd5.myworkdayjobs.com/en-US/careers/apply");

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("classify", () => {
  const key = (html: string) => {
    document.body.innerHTML = html;
    const el = document.body.querySelector("input,textarea,select") as HTMLElement;
    return classify(getSignals(el))?.key ?? null;
  };

  it("uses autocomplete first", () => {
    expect(key('<input autocomplete="family-name" />')).toBe("lastName");
  });
  it("reads label[for]", () => {
    expect(key('<label for="a">First Name *</label><input id="a" />')).toBe("firstName");
  });
  it("reads camelCase / snake_case names", () => {
    expect(key('<input name="linkedinUrl" />')).toBe("linkedin");
    expect(key('<input name="last_name" />')).toBe("lastName");
  });
  it("uses Workday automation ids", () => {
    expect(key('<input data-automation-id="legalNameSection_firstName" />')).toBe("firstName");
    expect(key('<input data-automation-id="addressSection_postalCode" />')).toBe("postalCode");
  });
  it("does not confuse phone device type with phone", () => {
    expect(key('<label for="d">Phone Device Type</label><input id="d" />')).toBeNull();
  });
  it("does not confuse country phone code with country", () => {
    expect(key('<label for="c">Country Phone Code</label><input id="c" />')).toBe("phoneCountryCode");
  });
});

describe("setNativeValue", () => {
  it("fires input and change so frameworks notice", () => {
    document.body.innerHTML = "<input />";
    const el = document.querySelector("input")!;
    const events: string[] = [];
    el.addEventListener("input", () => events.push("input"));
    el.addEventListener("change", () => events.push("change"));
    setNativeValue(el, "hello");
    expect(el.value).toBe("hello");
    expect(events).toEqual(["input", "change"]);
  });
});

describe("bestMatch", () => {
  const opts = [{ text: "Select One" }, { text: "India (+91)" }, { text: "United States (+1)" }];
  it("matches by substring", () => {
    expect(bestMatch(opts, "+91")).toBe(1);
    expect(bestMatch(opts, "India")).toBe(1);
  });
  it("returns -1 when nothing fits", () => {
    expect(bestMatch(opts, "Narnia")).toBe(-1);
  });
});

describe("profile schema", () => {
  it("defaults work history for older profile exports and keeps multiple entries", () => {
    const legacy = ProfileSchema.parse({ firstName: "Asha" });
    expect(legacy.workExperience).toEqual([]);

    const withWorkHistory = ProfileSchema.parse({
      workExperience: [
        {
          jobTitle: "Frontend Intern",
          company: "Example Co",
          location: "Pune",
          currentlyWorking: false,
          from: "2024-12",
          to: "2025-04",
          description: "Built frontend features.",
        },
        {
          jobTitle: "Software Engineer",
          company: "Current Co",
          location: "Gurgaon",
          currentlyWorking: true,
          from: "2025-06",
          to: "",
          description: "Working on the application.",
        },
      ],
    });
    expect(withWorkHistory.workExperience).toHaveLength(2);
    expect(withWorkHistory.workExperience[1]?.currentlyWorking).toBe(true);
  });
});

describe("fillPage (generic)", () => {
  it("uses a saved answer for a recognized select field when its profile value is unset", async () => {
    document.body.innerHTML = `
      <label for="right-to-work">Do you have the legal right to work in the country?</label>
      <select id="right-to-work">
        <option value="">Select One</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>`;
    const withSavedAnswer = ProfileSchema.parse({
      answers: [{ question: "legal right to work", answer: "Yes" }],
    });

    const report = await fillPage(document, withSavedAnswer, { dryRun: false, passes: 1 }, generic);

    expect((document.getElementById("right-to-work") as HTMLSelectElement).value).toBe("yes");
    expect(report.results[0]).toMatchObject({ key: "answer", status: "filled", value: "Yes" });
  });

  it("fills text, select and radio fields and reports unmatched ones", async () => {
    document.body.innerHTML = `
      <form>
        <label for="fn">First name</label><input id="fn" />
        <label for="ln">Last name</label><input id="ln" />
        <label for="em">Email</label><input id="em" type="email" />
        <label for="co">Country</label>
        <select id="co"><option value="">Select</option><option value="IN">India</option><option value="US">United States</option></select>
        <fieldset><legend>Are you legally authorized to work in India?</legend>
          <label><input type="radio" name="auth" value="y" /> Yes</label>
          <label><input type="radio" name="auth" value="n" /> No</label>
        </fieldset>
        <label for="q">Why do you want to join us?</label><textarea id="q"></textarea>
        <label for="x">Favourite colour</label><input id="x" />
      </form>`;
    const report = await fillPage(document, profile, { dryRun: false, passes: 1 }, generic);

    expect((document.getElementById("fn") as HTMLInputElement).value).toBe("Asha");
    expect((document.getElementById("ln") as HTMLInputElement).value).toBe("Rao");
    expect((document.getElementById("em") as HTMLInputElement).value).toBe("asha@example.com");
    expect((document.getElementById("co") as HTMLSelectElement).value).toBe("IN");
    expect((document.querySelector('input[value="y"]') as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById("q") as HTMLTextAreaElement).value).toBe("I like the product.");
    expect(report.results.find((r) => r.label.includes("favourite"))?.status).toBe("unmatched");
  });

  it("never overwrites a value the user already typed", async () => {
    document.body.innerHTML = '<label for="fn">First name</label><input id="fn" value="Typed" />';
    const report = await fillPage(document, profile, { dryRun: false, passes: 1 }, generic);
    expect((document.getElementById("fn") as HTMLInputElement).value).toBe("Typed");
    expect(report.results[0]?.status).toBe("skipped");
  });

  it("dry run changes nothing", async () => {
    document.body.innerHTML = '<label for="fn">First name</label><input id="fn" />';
    const report = await fillPage(document, profile, { dryRun: true }, generic);
    expect((document.getElementById("fn") as HTMLInputElement).value).toBe("");
    expect(report.results[0]).toMatchObject({ status: "filled", value: "Asha" });
  });
});

describe("fillPage (workday)", () => {
  it("selects the Workday adapter and fills by automation id", async () => {
    document.body.innerHTML = `
      <div data-automation-id="formField-legalNameSection_firstName">
        <label for="input-1">First Name<abbr>*</abbr></label>
        <input id="input-1" data-automation-id="legalNameSection_firstName" />
      </div>
      <div>
        <label for="input-2">City<abbr>*</abbr></label>
        <input id="input-2" data-automation-id="addressSection_city" />
      </div>`;
    const report = await fillPage(document, profile, { dryRun: false, passes: 1 }, workdayUrl);
    expect(report.adapter).toBe("workday");
    expect((document.getElementById("input-1") as HTMLInputElement).value).toBe("Asha");
    expect((document.getElementById("input-2") as HTMLInputElement).value).toBe("Pune");
  });
});
