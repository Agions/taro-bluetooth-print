/**
 * 文本模板渲染器
 */

import {
  ITemplateRenderer,
  ITemplate,
  ITemplateContext,
  TemplateType
} from '../types';

/**
 * 文本模板渲染器
 */
export class TextTemplateRenderer implements ITemplateRenderer {
  public readonly name = 'TextTemplateRenderer';
  public readonly supportedTypes = [TemplateType.TEXT];

  /**
   * 渲染模板
   */
  public async render(
    template: ITemplate,
    data: any,
    context: ITemplateContext
  ): Promise<ArrayBuffer> {
    if (typeof template.content !== 'string') {
      throw new Error('Text template content must be a string');
    }

    try {
      // 解析模板语法
      const parsed = this.parseTemplate(template.content as string);

      // 执行模板
      const result = await this.executeTemplate(parsed, data, context);

      // 编码为字节数组
      return new TextEncoder().encode(result).buffer;
    } catch (error) {
      throw new Error(`Text template render failed: ${error.message}`);
    }
  }

  /**
   * 验证模板
   */
  public async validate(template: ITemplate): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof template.content !== 'string') {
      errors.push('Text template content must be a string');
      return { valid: false, errors, warnings };
    }

    const content = template.content as string;

    // 检查语法错误
    const syntaxErrors = this.checkSyntax(content);
    errors.push(...syntaxErrors);

    // 检查未闭合的标签
    const tagErrors = this.checkTags(content);
    errors.push(...tagErrors);

    // 检查变量引用
    const variableWarnings = this.checkVariables(content, data, context);
    warnings.push(...variableWarnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 获取渲染器信息
   */
  public getInfo(): {
    name: string;
    supportedTypes: string[];
    features: string[];
  } {
    return {
      name: this.name,
      supportedTypes: this.supportedTypes,
      features: [
        'variable-interpolation',
        'function-calls',
        'filters',
        'conditionals',
        'loops',
        'comments'
      ]
    };
  }

  // 私有方法

  /**
   * 解析模板语法
   */
  private parseTemplate(template: string): ParsedTemplate {
    const tokens: Token[] = [];
    let pos = 0;

    while (pos < template.length) {
      const char = template[pos];

      if (char === '{' && pos + 1 < template.length && template[pos + 1] === '{') {
        // 查找结束标签
        const endPos = template.indexOf('}}', pos + 2);
        if (endPos === -1) {
          throw new Error(`Unclosed template expression at position ${pos}`);
        }

        const expression = template.slice(pos + 2, endPos);
        tokens.push(this.parseExpression(expression, pos));
        pos = endPos + 2;
      } else {
        // 普通文本
        let nextPos = template.indexOf('{{', pos);
        if (nextPos === -1) {
          nextPos = template.length;
        }

        const text = template.slice(pos, nextPos);
        if (text) {
          tokens.push({ type: 'text', value: text, position: pos });
        }
        pos = nextPos;
      }
    }

    return { tokens };
  }

  /**
   * 解析表达式
   */
  private parseExpression(expression: string, position: number): Token {
    expression = expression.trim();

    // 注释
    if (expression.startsWith('#')) {
      return {
        type: 'comment',
        value: expression.slice(1).trim(),
        position
      };
    }

    // 函数调用
    const functionMatch = expression.match(/^(\w+)\s*\((.*)\)$/);
    if (functionMatch) {
      const [, funcName, argsStr] = functionMatch;
      const args = this.parseArguments(argsStr);
      return {
        type: 'function',
        value: funcName,
        args,
        position
      };
    }

    // 过滤器
    const filterMatch = expression.match(/^(\w+)\s*\|\s*(.+)$/);
    if (filterMatch) {
      const [, variable, filterChain] = filterMatch;
      const filters = this.parseFilterChain(filterChain);
      return {
        type: 'filter',
        value: variable,
        filters,
        position
      };
    }

    // 条件语句
    if (expression.startsWith('if ')) {
      const condition = expression.slice(3).trim();
      return {
        type: 'if',
        value: condition,
        position
      };
    }

    if (expression.startsWith('elif ')) {
      const condition = expression.slice(5).trim();
      return {
        type: 'elif',
        value: condition,
        position
      };
    }

    if (expression === 'else') {
      return {
        type: 'else',
        value: '',
        position
      };
    }

    if (expression.startsWith('endif')) {
      return {
        type: 'endif',
        value: '',
        position
      };
    }

    // 循环语句
    if (expression.startsWith('for ')) {
      const loopExpr = expression.slice(4).trim();
      return {
        type: 'for',
        value: loopExpr,
        position
      };
    }

    if (expression.startsWith('endfor')) {
      return {
        type: 'endfor',
        value: '',
        position
      };
    }

    // 变量
    return {
      type: 'variable',
      value: expression,
      position
    };
  }

  /**
   * 解析参数
   */
  private parseArguments(argsStr: string): any[] {
    if (!argsStr.trim()) {
      return [];
    }

    const args: any[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    let depth = 0;

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];

      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (inString && char === stringChar) {
        inString = false;
        current += char;
      } else if (!inString && char === '(') {
        depth++;
        current += char;
      } else if (!inString && char === ')') {
        depth--;
        current += char;
      } else if (!inString && char === ',' && depth === 0) {
        args.push(this.parseValue(current.trim()));
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(this.parseValue(current.trim()));
    }

    return args;
  }

  /**
   * 解析值
   */
  private parseValue(value: string): any {
    // 字符串
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    // 数字
    if (!isNaN(Number(value))) {
      return Number(value);
    }

    // 布尔值
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;

    // 对象/数组（简单JSON）
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        // 忽略解析错误，返回原字符串
      }
    }

    // 变量引用
    return value;
  }

  /**
   * 解析过滤器链
   */
  private parseFilterChain(filterChain: string): Filter[] {
    const filters: Filter[] = [];
    const parts = filterChain.split('|').map(s => s.trim());

    for (const part of parts) {
      const match = part.match(/^(\w+)(?:\((.*)\))?$/);
      if (match) {
        const [, filterName, argsStr] = match;
        const args = argsStr ? this.parseArguments(argsStr) : [];
        filters.push({ name: filterName, args });
      }
    }

    return filters;
  }

  /**
   * 执行模板
   */
  private async executeTemplate(
    parsed: ParsedTemplate,
    data: any,
    context: ITemplateContext
  ): Promise<string> {
    let result = '';
    let i = 0;

    while (i < parsed.tokens.length) {
      const token = parsed.tokens[i];

      switch (token.type) {
        case 'text':
          result += token.value;
          i++;
          break;

        case 'comment':
          // 跳过注释
          i++;
          break;

        case 'variable':
          result += await this.resolveVariable(token.value, data, context);
          i++;
          break;

        case 'filter':
          result += await this.applyFilter(token.value, token.filters, data, context);
          i++;
          break;

        case 'function':
          result += await this.callFunction(token.value, token.args, data, context);
          i++;
          break;

        case 'if':
          const ifResult = await this.executeIfStatement(parsed, i, data, context);
          result += ifResult.content;
          i = ifResult.nextIndex;
          break;

        case 'for':
          const forResult = await this.executeForStatement(parsed, i, data, context);
          result += forResult.content;
          i = forResult.nextIndex;
          break;

        default:
          // 未知标签，原样输出
          result += `{{${token.value}}}`;
          i++;
          break;
      }
    }

    return result;
  }

  /**
   * 解析变量值
   */
  private async resolveVariable(
    path: string,
    data: any,
    context: ITemplateContext
  ): Promise<string> {
    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // 检查上下文
        if (part in context) {
          current = context[part];
        } else {
          return '';
        }
      }
    }

    return String(current || '');
  }

  /**
   * 应用过滤器
   */
  private async applyFilter(
    variable: string,
    filters: Filter[],
    data: any,
    context: ITemplateContext
  ): Promise<string> {
    let value = await this.resolveVariable(variable, data, context);

    for (const filter of filters) {
      const filterFunc = context.filters.get(filter.name);
      if (filterFunc) {
        const args = [value, ...filter.args];
        value = await this.executeFunction(filter.name, args, data, context);
      } else {
        // 内置过滤器
        value = this.applyBuiltinFilter(filter.name, value, filter.args);
      }
    }

    return String(value);
  }

  /**
   * 调用函数
   */
  private async callFunction(
    funcName: string,
    args: any[],
    data: any,
    context: ITemplateContext
  ): Promise<string> {
    const func = context.functions.get(funcName);
    if (func) {
      // 处理变量参数
      const processedArgs = args.map(arg => {
        if (typeof arg === 'string') {
          // 检查是否是变量引用
          if (arg.startsWith('$') && arg.length > 1) {
            return this.resolveVariable(arg.slice(1), data, context);
          }
        }
        return arg;
      });

      const result = func.execute(...processedArgs);
      return String(result);
    } else {
      throw new Error(`Unknown function: ${funcName}`);
    }
  }

  /**
   * 执行if语句
   */
  private async executeIfStatement(
    parsed: ParsedTemplate,
    startIndex: number,
    data: any,
    context: ITemplateContext
  ): Promise<{ content: string; nextIndex: number }> {
    const i = startIndex + 1;
    const ifToken = parsed.tokens[startIndex];
    const condition = ifToken.value;

    // 查找匹配的endif
    let endifIndex = -1;
    let elseIndex = -1;
    let depth = 0;

    for (let j = i; j < parsed.tokens.length; j++) {
      const token = parsed.tokens[j];
      if (token.type === 'if') {
        depth++;
      } else if (token.type === 'endif') {
        if (depth === 0) {
          endifIndex = j;
          break;
        }
        depth--;
      } else if (token.type === 'else' && depth === 0) {
        elseIndex = j;
      }
    }

    if (endifIndex === -1) {
      throw new Error('Unclosed if statement');
    }

    // 评估条件
    const conditionResult = await this.evaluateCondition(condition, data, context);

    // 确定执行范围
    let contentStart: number;
    let contentEnd: number;

    if (conditionResult) {
      contentStart = i;
      contentEnd = elseIndex !== -1 ? elseIndex : endifIndex;
    } else {
      if (elseIndex !== -1) {
        contentStart = elseIndex + 1;
        contentEnd = endifIndex;
      } else {
        contentStart = endifIndex;
        contentEnd = endifIndex;
      }
    }

    // 执行内容
    const subTokens = parsed.tokens.slice(contentStart, contentEnd);
    const subParsed = { tokens: subTokens };
    const content = await this.executeTemplate(subParsed, data, context);

    return { content, nextIndex: endifIndex + 1 };
  }

  /**
   * 执行for语句
   */
  private async executeForStatement(
    parsed: ParsedTemplate,
    startIndex: number,
    data: any,
    context: ITemplateContext
  ): Promise<{ content: string; nextIndex: number }> {
    const i = startIndex + 1;
    const forToken = parsed.tokens[startIndex];
    const loopExpr = forToken.value;

    // 查找endfor
    let endIndex = -1;
    for (let j = i; j < parsed.tokens.length; j++) {
      if (parsed.tokens[j].type === 'endfor') {
        endIndex = j;
        break;
      }
    }

    if (endIndex === -1) {
      throw new Error('Unclosed for statement');
    }

    // 解析循环表达式
    const loopMatch = loopExpr.match(/^(\w+)\s+in\s+(.+)$/);
    if (!loopMatch) {
      throw new Error('Invalid for statement syntax');
    }

    const [, itemName, itemsPath] = loopMatch;
    const items = await this.resolveVariable(itemsPath, data, context);

    // 执行循环
    let result = '';
    if (Array.isArray(items)) {
      const subTokens = parsed.tokens.slice(i, endIndex);
      const subParsed = { tokens: subTokens };

      for (const item of items) {
        const loopData = { ...data, [itemName]: item };
        const loopResult = await this.executeTemplate(subParsed, loopData, context);
        result += loopResult;
      }
    }

    return { content: result, nextIndex: endIndex + 1 };
  }

  /**
   * 评估条件
   */
  private async evaluateCondition(
    condition: string,
    data: any,
    context: ITemplateContext
  ): Promise<boolean> {
    // 简单的条件评估
    condition = condition.trim();

    // 检查存在性
    if (condition.endsWith(' exists')) {
      const path = condition.slice(0, -7).trim();
      const value = await this.resolveVariable(path, data, context);
      return value !== '' && value !== null && value !== undefined;
    }

    // 检查相等
    const equalMatch = condition.match(/^(.+?)\s*==\s*(.+)$/);
    if (equalMatch) {
      const [, left, right] = equalMatch;
      const leftValue = await this.resolveVariable(left.trim(), data, context);
      const rightValue = this.parseValue(right.trim());
      return leftValue == rightValue;
    }

    // 检查不等
    const notEqualMatch = condition.match(/^(.+?)\s*!=\s*(.+)$/);
    if (notEqualMatch) {
      const [, left, right] = notEqualMatch;
      const leftValue = await this.resolveVariable(left.trim(), data, context);
      const rightValue = this.parseValue(right.trim());
      return leftValue != rightValue;
    }

    // 检查布尔值
    const boolValue = await this.resolveVariable(condition, data, context);
    return boolValue === 'true' || boolValue === true;
  }

  /**
   * 应用内置过滤器
   */
  private applyBuiltinFilter(filterName: string, value: string, args: any[]): string {
    switch (filterName) {
      case 'default':
        return value || (args[0] || '');
      case 'upper':
        return value.toUpperCase();
      case 'lower':
        return value.toLowerCase();
      case 'trim':
        return value.trim();
      case 'length':
        return String(value.length);
      case 'number':
        const num = Number(value);
        const decimals = args[0];
        return isNaN(num) ? '0' : (decimals !== undefined ? num.toFixed(decimals) : num.toString());
      case 'currency':
        const currency = args[0] || '¥';
        const currencyNum = Number(value);
        return isNaN(currencyNum) ? `${currency}0.00` : `${currency}${currencyNum.toFixed(2)}`;
      default:
        return value;
    }
  }

  /**
   * 检查语法错误
   */
  private checkSyntax(template: string): string[] {
    const errors: string[] = [];
    let pos = 0;

    while (pos < template.length) {
      if (template[pos] === '{' && pos + 1 < template.length && template[pos + 1] === '{') {
        const endPos = template.indexOf('}}', pos + 2);
        if (endPos === -1) {
          errors.push(`Unclosed template expression at position ${pos}`);
          break;
        }
        pos = endPos + 2;
      } else {
        pos++;
      }
    }

    return errors;
  }

  /**
   * 检查标签错误
   */
  private checkTags(template: string): string[] {
    const errors: string[] = [];
    const tagStack: string[] = [];

    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      const expression = match[1].trim();

      if (expression.startsWith('if ')) {
        tagStack.push('if');
      } else if (expression.startsWith('for ')) {
        tagStack.push('for');
      } else if (expression === 'endif') {
        if (tagStack[tagStack.length - 1] !== 'if') {
          errors.push(`Mismatched endif tag at position ${match.index}`);
        } else {
          tagStack.pop();
        }
      } else if (expression === 'endfor') {
        if (tagStack[tagStack.length - 1] !== 'for') {
          errors.push(`Mismatched endfor tag at position ${match.index}`);
        } else {
          tagStack.pop();
        }
      } else if (expression === 'else') {
        if (tagStack[tagStack.length - 1] !== 'if') {
          errors.push(`Else tag outside if block at position ${match.index}`);
        }
      }
    }

    // 检查未闭合的标签
    for (const tag of tagStack) {
      errors.push(`Unclosed ${tag} tag`);
    }

    return errors;
  }

  /**
   * 检查变量引用
   */
  private checkVariables(template: string, data: any, context: ITemplateContext): string[] {
    const warnings: string[] = [];
    const referencedVars = new Set<string>();

    // 收集变量引用
    const regex = /\{\{([^}|]+)\}\}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      const expression = match[1].trim();

      // 提取变量名（简化实现）
      if (!expression.startsWith('#') && !expression.startsWith('if ') && !expression.startsWith('for ') &&
          !expression.startsWith('endif') && !expression.startsWith('endfor') && expression !== 'else' &&
          !expression.includes('(') && !expression.includes('|')) {
        referencedVars.add(expression);
      }
    }

    // 检查变量是否存在
    for (const varName of referencedVars) {
      if (!this.variableExists(varName, data, context)) {
        warnings.push(`Undefined variable: ${varName}`);
      }
    }

    return warnings;
  }

  /**
   * 检查变量是否存在
   */
  private variableExists(path: string, data: any, context: ITemplateContext): boolean {
    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else if (part in context) {
        current = context[part];
      } else {
        return false;
      }
    }

    return true;
  }
}

// 类型定义
interface Token {
  type: string;
  value: string;
  args?: any[];
  filters?: Filter[];
  position: number;
}

interface Filter {
  name: string;
  args: any[];
}

interface ParsedTemplate {
  tokens: Token[];
}