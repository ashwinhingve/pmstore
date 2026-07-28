import { describe, it, expect } from 'vitest';
import { buildReply } from './replies';

describe('buildReply', () => {
  it('greets on a bare hello / namaste', () => {
    expect(buildReply('hi')).toMatch(/swagat/i);
    expect(buildReply('Namaste')).toMatch(/swagat/i);
  });

  it('answers timing questions in English and Hinglish', () => {
    expect(buildReply('aap kab tak khule ho')).toMatch(/9 baje/);
    expect(buildReply('what are your timings?')).toMatch(/9 baje/);
  });

  it('answers location questions', () => {
    expect(buildReply('address kya hai')).toMatch(/Bhopal/);
    expect(buildReply('where is your shop')).toMatch(/Bhopal/);
  });

  it('explains how to order', () => {
    expect(buildReply('mujhe medicine order karni hai')).toMatch(/order/i);
  });

  it('routes prescription questions to the prescription reply, not ordering', () => {
    const reply = buildReply('prescription kaise upload karu');
    expect(reply).toMatch(/prescription/i);
    expect(reply).toMatch(/Schedule H/);
  });

  it('answers delivery before treating "kitna" as a price question', () => {
    expect(buildReply('delivery charge kitna hai')).toMatch(/home delivery/i);
  });

  it('gives the shop phone number when the customer wants a human', () => {
    expect(buildReply('mujhe kisi se baat karni hai')).toContain('9755550126');
    expect(buildReply('please call me')).toContain('9755550126');
  });

  it('falls back with guidance for anything it cannot match', () => {
    const reply = buildReply('asdfghjkl qwerty zxcvb');
    expect(reply).toMatch(/samajh nahi/i);
    expect(reply).toContain('9755550126');
  });

  it('never returns an empty reply', () => {
    for (const input of ['', '   ', '🙂', 'random text here']) {
      expect(buildReply(input).length).toBeGreaterThan(0);
    }
  });
});
