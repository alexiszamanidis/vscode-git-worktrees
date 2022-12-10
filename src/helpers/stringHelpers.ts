import { parse, dirname } from "path";

export const removeFirstAndLastCharacter = (str: string): string => str.slice(1, -1);

export const removeLastDirectoryInURL = (path: string): string => {
    return dirname(path);
};

export const removeNewLine = (string: string): string => {
    return string.replace(/\n/g, "");
};

export const getFileFromPath = async (path: string) => {
    const file = await parse(path).base;
    return file;
};
