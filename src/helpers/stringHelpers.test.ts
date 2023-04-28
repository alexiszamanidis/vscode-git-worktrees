import {
    removeFirstAndLastCharacter,
    removeLastDirectoryInURL,
    removeNewLine,
    escapeSpaces,
} from "./stringHelpers";

describe("stringHelpers", () => {
    describe("stringHelpers", () => {
        it("should remove first and last characters from string", () => {
            // given
            const str = "test";

            // when
            const result = removeFirstAndLastCharacter(str);

            // then
            expect(result).toBe("es");
        });
    });

    describe("removeLastDirectoryInURL", () => {
        it("should remove last subfolder", () => {
            // given
            const path = "/folder/subfolder1/subfolder2";

            // when
            const result = removeLastDirectoryInURL(path);

            // then
            expect(result).toBe("/folder/subfolder1");
        });
    });

    describe("removeNewLine", () => {
        it("should new line characters from string", () => {
            // given
            const string = "test\ntest\ntest";

            // when
            const result = removeNewLine(string);

            // then
            expect(result).toBe("testtesttest");
        });
    });

    describe("escapeSpaces", () => {
        it("should return the input string if it contains no spaces", () => {
            // given
            const str = "ThisIsAStringWithNoSpaces";

            // when
            const escapedStr = escapeSpaces(str);

            // then
            expect(escapedStr).toEqual(str);
        });

        it("should escape all spaces in the input string", () => {
            // given
            const str = "This is a string with spaces.";

            // when
            const escapedStr = escapeSpaces(str);

            // then
            expect(escapedStr).toEqual("This\\ is\\ a\\ string\\ with\\ spaces.");
        });

        it("should escape leading and trailing spaces in the input string", () => {
            // given
            const str = "    This string has spaces at the beginning and end.    ";

            // when
            const escapedStr = escapeSpaces(str);

            // then
            expect(escapedStr).toEqual(
                "\\ \\ \\ \\ This\\ string\\ has\\ spaces\\ at\\ the\\ beginning\\ and\\ end.\\ \\ \\ \\ "
            );
        });

        it("should escape multiple spaces in a row in the input string", () => {
            // given
            const str = "This  is  a  string  with  extra  spaces.";

            // when
            const escapedStr = escapeSpaces(str);

            // then
            expect(escapedStr).toEqual(
                "This\\ \\ is\\ \\ a\\ \\ string\\ \\ with\\ \\ extra\\ \\ spaces."
            );
        });

        it("should escape an input string with only spaces", () => {
            // given
            const str = "    ";

            // when
            const escapedStr = escapeSpaces(str);

            // then
            expect(escapedStr).toEqual("\\ \\ \\ \\ ");
        });
    });
});
