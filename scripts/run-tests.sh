#!/bin/bash

# 测试运行脚本

set -e

echo "🧪 开始运行测试套件..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数：打印带颜色的消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 函数：检查依赖
check_dependencies() {
    print_message $BLUE "📦 检查测试依赖..."

    if ! command -v node &> /dev/null; then
        print_message $RED "❌ Node.js 未安装"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_message $RED "❌ npm 未安装"
        exit 1
    fi

    print_message $GREEN "✅ 依赖检查完成"
}

# 函数：安装依赖
install_dependencies() {
    print_message $BLUE "📥 安装测试依赖..."
    npm install
    print_message $GREEN "✅ 依赖安装完成"
}

# 函数：清理缓存
clean_cache() {
    print_message $BLUE "🧹 清理测试缓存..."
    npm run test:clear
    rm -rf .jest-cache
    rm -rf test-results
    print_message $GREEN "✅ 缓存清理完成"
}

# 函数：运行单元测试
run_unit_tests() {
    print_message $BLUE "🔬 运行单元测试..."

    if npm run test:unit; then
        print_message $GREEN "✅ 单元测试通过"
    else
        print_message $RED "❌ 单元测试失败"
        return 1
    fi
}

# 函数：运行集成测试
run_integration_tests() {
    print_message $BLUE "🔗 运行集成测试..."

    if npm run test:integration; then
        print_message $GREEN "✅ 集成测试通过"
    else
        print_message $RED "❌ 集成测试失败"
        return 1
    fi
}

# 函数：运行E2E测试
run_e2e_tests() {
    print_message $BLUE "🎭 运行E2E测试..."

    if npm run test:e2e; then
        print_message $GREEN "✅ E2E测试通过"
    else
        print_message $RED "❌ E2E测试失败"
        return 1
    fi
}

# 函数：运行性能测试
run_performance_tests() {
    print_message $BLUE "⚡ 运行性能测试..."

    if npm run test:performance; then
        print_message $GREEN "✅ 性能测试通过"
    else
        print_message $YELLOW "⚠️ 性能测试警告"
    fi
}

# 函数：生成覆盖率报告
generate_coverage_report() {
    print_message $BLUE "📊 生成覆盖率报告..."

    if npm run test:coverage; then
        print_message $GREEN "✅ 覆盖率报告生成完成"

        # 打开覆盖率报告
        if command -v open &> /dev/null; then
            open coverage/lcov-report/index.html
        elif command -v xdg-open &> /dev/null; then
            xdg-open coverage/lcov-report/index.html
        fi
    else
        print_message $RED "❌ 覆盖率报告生成失败"
    fi
}

# 函数：生成测试报告
generate_test_report() {
    print_message $BLUE "📋 生成测试报告..."

    # 创建报告目录
    mkdir -p test-results/reports

    # 生成 HTML 报告
    cat > test-results/reports/summary.html << EOF
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试报告 - $(date)</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .code { background-color: #f8f9fa; padding: 10px; border-radius: 3px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 测试报告</h1>
        <p>生成时间: $(date)</p>
        <p>项目: Taro Bluetooth Print</p>
    </div>

    <div class="section">
        <h2>📊 测试概览</h2>
        <div class="code">
            测试套件运行完成<br>
            详细报告请查看 test-results 目录
        </div>
    </div>

    <div class="section">
        <h2>📁 相关文件</h2>
        <ul>
            <li><a href="../coverage/lcov-report/index.html">覆盖率报告</a></li>
            <li><a href="./unit/junit.xml">单元测试结果</a></li>
            <li><a href="./integration/junit.xml">集成测试结果</a></li>
            <li><a href="./e2e/junit.xml">E2E测试结果</a></li>
        </ul>
    </div>
</body>
</html>
EOF

    print_message $GREEN "✅ 测试报告生成完成"
}

# 函数：验证测试结果
verify_test_results() {
    print_message $BLUE "🔍 验证测试结果..."

    # 检查覆盖率
    if [ -f "coverage/coverage-summary.json" ]; then
        local lines=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
        local functions=$(cat coverage/coverage-summary.json | jq '.total.functions.pct')
        local branches=$(cat coverage/coverage-summary.json | jq '.total.branches.pct')
        local statements=$(cat coverage/coverage-summary.json | jq '.total.statements.pct')

        print_message $BLUE "📈 覆盖率统计:"
        echo "  - 行覆盖: ${lines}%"
        echo "  - 函数覆盖: ${functions}%"
        echo "  - 分支覆盖: ${branches}%"
        echo "  - 语句覆盖: ${statements}%"

        # 检查是否达到目标覆盖率
        if (( $(echo "$lines >= 80" | bc -l) )); then
            print_message $GREEN "✅ 行覆盖率达到目标 (≥80%)"
        else
            print_message $YELLOW "⚠️ 行覆盖率未达到目标 (<80%)"
        fi
    fi

    print_message $GREEN "✅ 测试结果验证完成"
}

# 函数：显示帮助信息
show_help() {
    echo "测试运行脚本使用说明:"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示帮助信息"
    echo "  -c, --clean         清理缓存"
    echo "  -u, --unit          仅运行单元测试"
    echo "  -i, --integration   仅运行集成测试"
    echo "  -e, --e2e           仅运行E2E测试"
    echo "  -p, --performance   仅运行性能测试"
    echo "  -f, --full          运行完整测试套件 (默认)"
    echo "  --coverage          生成覆盖率报告"
    echo "  --no-install        跳过依赖安装"
    echo "  --verbose           详细输出"
    echo ""
    echo "示例:"
    echo "  $0                  # 运行完整测试套件"
    echo "  $0 --unit           # 仅运行单元测试"
    echo "  $0 --coverage       # 生成覆盖率报告"
}

# 主函数
main() {
    local run_unit=false
    local run_integration=false
    local run_e2e=false
    local run_performance=false
    local run_full=true
    local generate_coverage=false
    local skip_install=false
    local verbose=false

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--clean)
                clean_cache
                exit 0
                ;;
            -u|--unit)
                run_unit=true
                run_full=false
                shift
                ;;
            -i|--integration)
                run_integration=true
                run_full=false
                shift
                ;;
            -e|--e2e)
                run_e2e=true
                run_full=false
                shift
                ;;
            -p|--performance)
                run_performance=true
                run_full=false
                shift
                ;;
            -f|--full)
                run_full=true
                shift
                ;;
            --coverage)
                generate_coverage=true
                shift
                ;;
            --no-install)
                skip_install=true
                shift
                ;;
            --verbose)
                verbose=true
                set -x
                shift
                ;;
            *)
                print_message $RED "❌ 未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 开始测试流程
    print_message $BLUE "🚀 开始测试流程..."

    # 检查依赖
    check_dependencies

    # 安装依赖
    if [ "$skip_install" = false ]; then
        install_dependencies
    fi

    # 清理缓存
    clean_cache

    local test_failed=false

    # 运行测试
    if [ "$run_full" = true ] || [ "$run_unit" = true ]; then
        if ! run_unit_tests; then
            test_failed=true
        fi
    fi

    if [ "$run_full" = true ] || [ "$run_integration" = true ]; then
        if ! run_integration_tests; then
            test_failed=true
        fi
    fi

    if [ "$run_full" = true ] || [ "$run_e2e" = true ]; then
        if ! run_e2e_tests; then
            test_failed=true
        fi
    fi

    if [ "$run_full" = true ] || [ "$run_performance" = true ]; then
        if ! run_performance_tests; then
            test_failed=true
        fi
    fi

    # 生成覆盖率报告
    if [ "$generate_coverage" = true ] || [ "$run_full" = true ]; then
        generate_coverage_report
    fi

    # 生成测试报告
    generate_test_report

    # 验证测试结果
    verify_test_results

    # 显示最终结果
    echo ""
    if [ "$test_failed" = true ]; then
        print_message $RED "❌ 测试套件执行失败"
        exit 1
    else
        print_message $GREEN "🎉 测试套件执行成功"
        exit 0
    fi
}

# 运行主函数
main "$@"