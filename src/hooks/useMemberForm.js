/**
 * hooks/useMemberForm.js
 * Manages member form state, validation, draft persistence, and save logic.
 * Extracted from EditMemberModal so the component stays as pure UI.
 */

import { useState, useEffect, useCallback } from "react";
import { loadCache, saveCache } from "../utils/cache";
import { saveMember } from "../services/memberService";
import { normalizeMobile } from "../utils/normalizePhone";

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳" }, { code: "+1",   flag: "🇺🇸" },
  { code: "+44", flag: "🇬🇧" }, { code: "+61",  flag: "🇦🇺" },
  { code: "+971",flag: "🇦🇪" }, { code: "+974", flag: "🇶🇦" },
  { code: "+965",flag: "🇰🇼" }, { code: "+968", flag: "🇴🇲" },
  { code: "+60", flag: "🇲🇾" }, { code: "+65",  flag: "🇸🇬" },
  { code: "+49", flag: "🇩🇪" }, { code: "+81",  flag: "🇯🇵" },
];

export const EMPTY_FORM = {
  name: "", countryCode: "+91", mobile: "", email: "", gender: "",
  dobDay: "", dobMonth: "", dobYear: "",
  maritalStatus: "", remarriage: "", stayAway: false, stayCity: "",
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

function toProperCase(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function buildEducation(form) {
  if (!form.isStudent) return "";
  if (form.educationType === "School Student")      return form.standard;
  if (form.educationType === "College Student")     return `${form.degree || ""} ${form.year || ""}`.trim();
  if (form.educationType === "Postgraduate")        return `PG ${form.year || ""}`.trim();
  if (form.educationType === "Diploma / ITI")       return `Diploma ${form.year || ""}`.trim();
  if (form.educationType === "Professional Course") return `${form.courseName || ""} ${form.courseStage || ""}`.trim();
  if (form.educationType === "Competitive Prep")    return form.exam;
  return "";
}

export function useMemberForm({ open, mode, member, familyId, onClose }) {
  const isAdding = mode === "add";
  const draftKey = isAdding
    ? `memberDraft_new_${familyId}`
    : `memberDraft_${member?.id}`;

  const [form,       setForm]       = useState(null);
  const [errors,     setErrors]     = useState({});
  const [saving,     setSaving]     = useState(false);

  // Load form from draft or member data
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const draft = await loadCache(draftKey);
      if (draft && Object.keys(draft).length > 0) { setForm(draft); return; }

      if (isAdding) {
        setForm({ ...EMPTY_FORM });
      } else {
        if (!member) return;
        let countryCode = "+91";
        let mobileNum   = member.mobile || member.phone || "";
        if (mobileNum.startsWith("+")) {
          const match = COUNTRY_CODES.find(c => mobileNum.startsWith(c.code));
          if (match) { countryCode = match.code; mobileNum = mobileNum.slice(match.code.length); }
        }
        const dobParts = (member.dob || "").split("/");
        setForm({
          ...EMPTY_FORM,
          name:              member.name          || "",
          countryCode,
          mobile:            mobileNum,
          email:             member.email         || "",
          gender:            member.gender        || "",
          dobDay:            dobParts[0]          || "",
          dobMonth:          dobParts[1]          || "",
          dobYear:           dobParts[2]          || "",
          maritalStatus:     member.maritalStatus || (member.married === true ? "Married" : ""),
          remarriage:        member.remarriage    || "",
          stayAway:          member.stayAway      || false,
          stayCity:          member.stayCity      || "",
          isStudent:         member.isStudent     || false,
          occupation:        member.occupation    || "",
          educationType:     member.educationType || "",
          standard:          member.standard      || "",
          stream:            member.stream        || "",
          medium:            member.medium        || "",
          year:              member.year          || "",
          degree:            member.degree        || "",
          specialization:    member.specialization|| "",
          collegeName:       member.collegeName   || "",
          courseName:        member.courseName    || "",
          courseStage:       member.courseStage   || "",
          exam:              member.exam          || "",
          indoorSports:      member.indoorSports  || [],
          outdoorSports:     member.outdoorSports || [],
          talents:           member.talents       || [],
          creative:          member.creative      || [],
          hobbies:           member.hobbies       || [],
          funActivities:     member.funActivities || [],
          achievements:      member.achievements  || "",
          aboutMe:           member.aboutMe       || "",
          needsScholarship:  member.needsScholarship  ?? false,
          supportFees:       member.supportFees       || false,
          supportBooks:      member.supportBooks      || false,
          supportCoaching:   member.supportCoaching   || false,
          supportCounseling: member.supportCounseling || false,
          helpRequired:      member.helpRequired      || "",
          honoraryOrgs:      member.honoraryOrgs      || [],
        });
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAdding, member?.id]);

  // Reset when closed
  useEffect(() => {
    if (!open) { setForm(null); setErrors({}); }
  }, [open]);

  // Auto-save draft
  useEffect(() => {
    if (!form || !open) return;
    const t = setTimeout(() => saveCache(draftKey, form), 600);
    return () => clearTimeout(t);
  }, [form, draftKey, open]);

  const updateField = useCallback((field, value) =>
    setForm(prev => ({ ...prev, [field]: value })), []);

  const validate = () => {
    const errs = {};
    if (!form?.name?.trim()) errs.name = "Name is required";
    if (form?.mobile) {
      const digits = form.mobile.replace(/\D/g, "");
      if (digits.length < 7) errs.mobile = "Enter a valid mobile number";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const assembledMobile = form.mobile?.trim()
        ? normalizeMobile(`${form.countryCode || "+91"}${form.mobile.trim()}`)
        : "";
      const assembledDob = (form.dobDay && form.dobMonth && form.dobYear)
        ? `${form.dobDay}/${form.dobMonth}/${form.dobYear}` : "";
      const assembledName = form.name?.trim()
        ? toProperCase(form.name.trim()) : "";

      const payload = {
        ...form,
        name:    assembledName,
        mobile:  assembledMobile,
        dob:     assembledDob,
        education: buildEducation(form),
        married: form.maritalStatus === "Married" || form.maritalStatus === "Engaged",
      };
      delete payload.countryCode;
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

      await saveCache(draftKey, {});

      onClose(true, isAdding
        ? { id: savedId, familyId, ...payload }
        : { ...member, ...payload }
      );
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  return { form, errors, saving, updateField, validate, handleSave, isAdding };
}
