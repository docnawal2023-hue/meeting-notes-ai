import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatBytes, formatDuration, formatTimer } from "./helper.js";

describe("formatBytes", () => {
  it("formats bytes, kilobytes and megabytes", () => {
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(2048), "2 KB");
    assert.equal(formatBytes(1572864), "1.5 MB");
  });
});

describe("formatDuration", () => {
  it("formats seconds, minutes and hours", () => {
    assert.equal(formatDuration(45), "45 sec");
    assert.equal(formatDuration(300), "5 min");
    assert.equal(formatDuration(4500), "1 h 15 min");
    assert.equal(formatDuration(0), "");
  });
});

describe("formatTimer", () => {
  it("formats elapsed time with and without hours", () => {
    assert.equal(formatTimer(75), "01:15");
    assert.equal(formatTimer(3725), "1:02:05");
  });
});
