import {
    removeFirstAndLastCharacter,
    removeLastDirectoryInURL,
    removeNewLine,
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
});
