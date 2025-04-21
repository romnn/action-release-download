import { expect, it } from "vitest";
import { stripExtension } from "action-get-release/utils";

it("correctly strips file extensions", () => {
  expect(
    stripExtension("D:\\a\\_temp\\cargo-fc_0.0.39_windows_amd64.zip"),
  ).toEqual("D:\\a\\_temp\\cargo-fc_0.0.39_windows_amd64");

  expect(stripExtension("D:\\a\\_temp\\cargo-fc_0.0.39_windows_amd64")).toEqual(
    "D:\\a\\_temp\\cargo-fc_0.0",
  );

  expect(
    stripExtension("/home/users/roman/cargo-fc_0.0.39_windows_amd64.zip"),
  ).toEqual("/home/users/roman/cargo-fc_0.0.39_windows_amd64");

  expect(
    stripExtension("/home/users/roman/cargo-fc_0.0.39_windows_amd64"),
  ).toEqual("/home/users/roman/cargo-fc_0.0");

  expect(stripExtension("test.7z")).toEqual("test");
});
