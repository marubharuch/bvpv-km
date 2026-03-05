// hooks/useMemberForm.js — Member form state, validation, draft, and save.
import { useState, useEffect, useCallback } from "react";
import { cache }        from "../lib/cache";
import { saveMember }   from "../db/memberDb";
import { splitMobile, toMobileKey } from "../lib/phone";
import { toProperCase } from "../lib/text";
import { EDUCATION_TYPES } from "../constants/app";

export const EMPTY_FORM = {
  name: "", countryCode: "+91", mobile: "", email: "", gender: "",
  dobDay: "", dobMonth: "", dobYear: "",
  maritalStatus: "", stayAway: false, stayCity: "",
  isStudent: false, occupation: "",
  educationType: "", standard: "", stream: "", medium: "",
  year: "", degree: "", specialization: "", collegeName: "",
  courseName: "", courseStage: "", exam: "",
  indoorSports: [], outdoorSports: [], talents: [],
  creative: [], hobbies: [], funActivities: [],
  achievements: "", aboutMe: "",
  needsScholarship: false,
  supportFees: false, supportBooks: false,
  supportCoaching: false, supportCounseling: false,
  helpRequired: "",
  honoraryOrgs: [],
};

function buildEducationLabel(form) {
  if (!form.isStudent) return "";
  if (form.educationType === "School Student")      return form.standard;
  if (form.educationType === "College Student")     return `${form.degree} ${form.year}`.trim();
  if (form.educationType === "Postgraduate")        return `PG ${form.year}`.trim();
  if (form.educationType === "Diploma / ITI")       return `Diploma ${form.year}`.trim();
  if (form.educationType === "Professional Course") return `${form.courseName} ${form.courseStage}`.trim();
  if (form.educationType === "Competitive Prep")    return form.exam;
  return "";
}

export function useMemberForm({ open, mode, member, familyId, onClose }) {
  const isAdding = mode === "add";
  const draftKey = isAdding ? `draft:member:new:${familyId}` : `draft:member:${member?.id}`;

  const [form,   setForm]   = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Load draft or member data when modal opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      const draft = await cache.get(draftKey);
      if (draft && Object.keys(draft).length > 0) { setForm(draft); return; }

      if (isAdding) {
        setForm({ ...EMPTY_FORM });
        return;
      }
      if (!member) return;

      // Parse stored mobile correctly
      const { countryCode, digits } = member.countryCode
        ? { countryCode: member.countryCode, digits: (member.mobile || "").replace(/\D/g, "").slice(-10) }
        : splitMobile(member.mobile || "");

      const [dobDay = "", dobMonth = "", dobYear = ""] = (member.dob || "").split("/");

      setForm({
        ...EMPTY_FORM,
        name:          member.name          || "",
        countryCode,
        mobile:        digits,
        email:         member.email         || "",
        gender:        member.gender        || "",
        dobDay, dobMonth, dobYear,
        maritalStatus: member.maritalStatus || (member.married ? "Married" : ""),
        stayAway:      member.stayAway      || false,
        stayCity:      member.stayCity      || "",
        isStudent:     member.isStudent     || false,
        occupation:    member.occupation    || "",
        educationType: member.educationType || "",
        standard:      member.standard      || "",
        stream:        member.stream        || "",
        medium:        member.medium        || "",
        year:          member.year          || "",
        degree:        member.degree        || "",
        specialization:  member.specialization  || "",
        collegeName:     member.collegeName     || "",
        courseName:      member.courseName      || "",
        courseStage:     member.courseStage     || "",
        exam:            member.exam            || "",
        indoorSports:    member.indoorSports    || [],
        outdoorSports:   member.outdoorSports   || [],
        talents:         member.talents         || [],
        creative:        member.creative        || [],
        hobbies:         member.hobbies         || [],
        funActivities:   member.funActivities   || [],
        achievements:    member.achievements    || "",
        aboutMe:         member.aboutMe         || "",
        needsScholarship:  member.needsScholarship  ?? false,
        supportFees:       member.supportFees       || false,
        supportBooks:      member.supportBooks      || false,
        supportCoaching:   member.supportCoaching   || false,
        supportCounseling: member.supportCounseling || false,
        helpRequired:      member.helpRequired      || "",
        honoraryOrgs:      member.honoraryOrgs      || [],
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAdding, member?.id]);

  useEffect(() => { if (!open) { setForm(null); setErrors({}); } }, [open]);

  // Auto-save draft
  useEffect(() => {
    if (!form || !open) return;
    const t = setTimeout(() => cache.set(draftKey, form), 600);
    return () => clearTimeout(t);
  }, [form, draftKey, open]);

  const update = useCallback((field, value) =>
    setForm(prev => ({ ...prev, [field]: value })), []);

  const validate = () => {
    const errs = {};
    if (!form?.name?.trim()) errs.name = "Name is required";
    if (form?.mobile && form.mobile.replace(/\D/g, "").length < 7)
      errs.mobile = "Enter a valid mobile number";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const cc  = form.countryCode || "+91";
      const dob = (form.dobDay && form.dobMonth && form.dobYear)
                    ? `${form.dobDay}/${form.dobMonth}/${form.dobYear}` : "";

      // Pass raw input — memberDb.saveMember normalizes to fullMobile
      const payload = {
        ...form,
        name:        toProperCase(form.name.trim()),
        mobile:      form.mobile?.trim() || "",   // raw digits from input
        countryCode: cc,
        dob,
        education:   buildEducationLabel(form),
        married:     ["Married","Engaged"].includes(form.maritalStatus),
      };
      delete payload.dobDay;
      delete payload.dobMonth;
      delete payload.dobYear;

      const savedId = await saveMember({
        memberId:       isAdding ? null : member.id,
        familyId,
        payload,
        isAdding,
        existingMember: isAdding ? {} : member,
      });

      await cache.set(draftKey, {});
      onClose(true, isAdding
        ? { id: savedId, familyId, ...payload }
        : { ...member, ...payload });
    } catch (e) {
      console.error("Save failed:", e);
      if (e.message?.includes("already registered")) {
        setErrors(prev => ({ ...prev, mobile: e.message }));
      }
    } finally {
      setSaving(false);
    }
  };

  return { form, errors, saving, update, validate, handleSave, isAdding };
}