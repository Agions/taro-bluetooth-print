/**
 * 临时类型声明，用于解决缺失的 @types/yargs-parser 依赖
 */
declare module 'yargs-parser' {
  interface Options {
    [key: string]: any;
  }
  
  interface ParsedArguments {
    [key: string]: any;
    _: string[];
  }
  
  function yargsParser(args: string | string[], options?: Options): ParsedArguments;
  
  export = yargsParser;
} 