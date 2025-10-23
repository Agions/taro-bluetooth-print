/**
 * 临时类型声明，用于解决缺失的 @types/yargs 依赖
 */
declare module 'yargs' {
  interface Argv {
    [key: string]: any;
  }
  
  interface YargsStatic {
    argv: Argv;
    [key: string]: any;
  }
  
  const yargs: YargsStatic;
  
  export = yargs;
} 