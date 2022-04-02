export const removeFirstAndLastCharacter = (str: string): string => str.slice(1, -1);

export const removeLastDirectoryInURL = (path: string): string => {
    const pathParts = path.split("/");
    pathParts.pop();
    return pathParts.join("/");
};
