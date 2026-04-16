const URL_REGEX = /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*/gi;

const testCases = [
  "Check this https://google.com",
  "Check this http://google.com",
  "Check this www.google.com",
  "No link here",
  "Multi links: www.google.com and https://bing.com",
  "Link with path: www.example.com/test?q=123",
  "Link at the end of sentence. www.example.com",
];

testCases.forEach((str) => {
  const matches = str.match(URL_REGEX);
  console.log(`String: "${str}" -> Matches:`, matches);
});
