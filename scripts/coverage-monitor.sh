#!/bin/bash

# 覆盖率监控脚本

set -e

echo "📊 启动覆盖率监控..."

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

# 函数：检查覆盖率工具
check_coverage_tools() {
    print_message $BLUE "🔧 检查覆盖率工具..."

    if ! command -v nyc &> /dev/null && ! npm list nyc &> /dev/null; then
        print_message $YELLOW "⚠️ nyc 未安装，将使用 Jest 内置覆盖率"
    fi

    if ! command -v jq &> /dev/null; then
        print_message $YELLOW "⚠️ jq 未安装，无法解析 JSON 覆盖率数据"
    fi

    print_message $GREEN "✅ 覆盖率工具检查完成"
}

# 函数：运行测试并收集覆盖率
run_coverage_tests() {
    print_message $BLUE "🧪 运行覆盖率测试..."

    # 清理旧的覆盖率数据
    rm -rf coverage
    rm -f coverage-summary.json
    rm -f coverage-final.json

    # 运行测试并收集覆盖率
    if npm run test:coverage; then
        print_message $GREEN "✅ 覆盖率测试完成"
    else
        print_message $RED "❌ 覆盖率测试失败"
        return 1
    fi
}

# 函数：解析覆盖率数据
parse_coverage_data() {
    print_message $BLUE "📈 解析覆盖率数据..."

    if [ -f "coverage/coverage-summary.json" ]; then
        if command -v jq &> /dev/null; then
            local lines=$(cat coverage/coverage-summary.json | jq -r '.total.lines.pct // "N/A"')
            local functions=$(cat coverage/coverage-summary.json | jq -r '.total.functions.pct // "N/A"')
            local branches=$(cat coverage/coverage-summary.json | jq -r '.total.branches.pct // "N/A"')
            local statements=$(cat coverage/coverage-summary.json | jq -r '.total.statements.pct // "N/A"')

            print_message $BLUE "📊 当前覆盖率统计:"
            echo "  📝 行覆盖: ${lines}%"
            echo "  🔧 函数覆盖: ${functions}%"
            echo "  🌿 分支覆盖: ${branches}%"
            echo "  📖 语句覆盖: ${statements}%"

            # 保存到环境变量供后续使用
            export COVERAGE_LINES=$lines
            export COVERAGE_FUNCTIONS=$functions
            export COVERAGE_BRANCHES=$branches
            export COVERAGE_STATEMENTS=$statements

            return 0
        else
            print_message $YELLOW "⚠️ 无法解析 JSON 数据，请安装 jq"
            return 1
        fi
    else
        print_message $RED "❌ 覆盖率数据文件不存在"
        return 1
    fi
}

# 函数：检查覆盖率阈值
check_coverage_thresholds() {
    print_message $BLUE "🎯 检查覆盖率阈值..."

    local lines_threshold=${COVERAGE_LINES_THRESHOLD:-80}
    local functions_threshold=${COVERAGE_FUNCTIONS_THRESHOLD:-80}
    local branches_threshold=${COVERAGE_BRANCHES_THRESHOLD:-80}
    local statements_threshold=${COVERAGE_STATEMENTS_THRESHOLD:-80}

    local threshold_passed=true

    # 检查行覆盖率
    if (( $(echo "$COVERAGE_LINES < $lines_threshold" | bc -l 2>/dev/null || echo "0") )); then
        print_message $RED "❌ 行覆盖率不足: ${COVERAGE_LINES}% < ${lines_threshold}%"
        threshold_passed=false
    else
        print_message $GREEN "✅ 行覆盖率达标: ${COVERAGE_LINES}% >= ${lines_threshold}%"
    fi

    # 检查函数覆盖率
    if (( $(echo "$COVERAGE_FUNCTIONS < $functions_threshold" | bc -l 2>/dev/null || echo "0") )); then
        print_message $RED "❌ 函数覆盖率不足: ${COVERAGE_FUNCTIONS}% < ${functions_threshold}%"
        threshold_passed=false
    else
        print_message $GREEN "✅ 函数覆盖率达标: ${COVERAGE_FUNCTIONS}% >= ${functions_threshold}%"
    fi

    # 检查分支覆盖率
    if (( $(echo "$COVERAGE_BRANCHES < $branches_threshold" | bc -l 2>/dev/null || echo "0") )); then
        print_message $RED "❌ 分支覆盖率不足: ${COVERAGE_BRANCHES}% < ${branches_threshold}%"
        threshold_passed=false
    else
        print_message $GREEN "✅ 分支覆盖率达标: ${COVERAGE_BRANCHES}% >= ${branches_threshold}%"
    fi

    # 检查语句覆盖率
    if (( $(echo "$COVERAGE_STATEMENTS < $statements_threshold" | bc -l 2>/dev/null || echo "0") )); then
        print_message $RED "❌ 语句覆盖率不足: ${COVERAGE_STATEMENTS}% < ${statements_threshold}%"
        threshold_passed=false
    else
        print_message $GREEN "✅ 语句覆盖率达标: ${COVERAGE_STATEMENTS}% >= ${statements_threshold}%"
    fi

    if [ "$threshold_passed" = true ]; then
        print_message $GREEN "🎉 所有覆盖率阈值检查通过"
        return 0
    else
        print_message $RED "❌ 覆盖率阈值检查失败"
        return 1
    fi
}

# 函数：生成覆盖率趋势报告
generate_trend_report() {
    print_message $BLUE "📈 生成覆盖率趋势报告..."

    local trend_file="coverage/trend.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # 确保目录存在
    mkdir -p coverage

    # 创建或更新趋势文件
    if [ -f "$trend_file" ]; then
        # 更新现有趋势文件
        local temp_file=$(mktemp)
        jq ". += [{\"timestamp\": \"$timestamp\", \"lines\": $COVERAGE_LINES, \"functions\": $COVERAGE_FUNCTIONS, \"branches\": $COVERAGE_BRANCHES, \"statements\": $COVERAGE_STATEMENTS}]" "$trend_file" > "$temp_file"
        mv "$temp_file" "$trend_file"
    else
        # 创建新趋势文件
        echo "[{\"timestamp\": \"$timestamp\", \"lines\": $COVERAGE_LINES, \"functions\": $COVERAGE_FUNCTIONS, \"branches\": $COVERAGE_BRANCHES, \"statements\": $COVERAGE_STATEMENTS}]" > "$trend_file"
    fi

    # 保持最近30条记录
    local temp_file=$(mktemp)
    jq '.[-30:]' "$trend_file" > "$temp_file"
    mv "$temp_file" "$trend_file"

    print_message $GREEN "✅ 趋势报告已更新: $trend_file"
}

# 函数：生成覆盖率徽章
generate_coverage_badge() {
    print_message $BLUE "🏆 生成覆盖率徽章..."

    local badge_file="coverage/coverage-badge.svg"
    local color="brightgreen"

    # 根据覆盖率选择颜色
    if (( $(echo "$COVERAGE_LINES >= 90" | bc -l 2>/dev/null || echo "0") )); then
        color="brightgreen"
    elif (( $(echo "$COVERAGE_LINES >= 80" | bc -l 2>/dev/null || echo "0") )); then
        color="green"
    elif (( $(echo "$COVERAGE_LINES >= 70" | bc -l 2>/dev/null || echo "0") )); then
        color="yellow"
    elif (( $(echo "$COVERAGE_LINES >= 60" | bc -l 2>/dev/null || echo "0") )); then
        color="orange"
    else
        color="red"
    fi

    # 生成SVG徽章
    cat > "$badge_file" << EOF
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="120" height="20" role="img">
  <title>coverage: ${COVERAGE_LINES}%</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="120" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="60" height="20" fill="#555"/>
    <rect x="60" width="60" height="20" fill="#$color"/>
    <rect width="120" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="30" y="15" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="450">coverage</text>
    <text x="30" y="15" transform="scale(.1)" fill="#fff" textLength="450">coverage</text>
    <text aria-hidden="true" x="90" y="15" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="550">${COVERAGE_LINES}%</text>
    <text x="90" y="15" transform="scale(.1)" fill="#fff" textLength="550">${COVERAGE_LINES}%</text>
  </g>
</svg>
EOF

    print_message $GREEN "✅ 覆盖率徽章已生成: $badge_file"
}

# 函数：上传覆盖率数据
upload_coverage_data() {
    print_message $BLUE "☁️ 上传覆盖率数据..."

    # 上传到 Coveralls
    if [ -n "$COVERALLS_REPO_TOKEN" ]; then
        print_message $BLUE "📤 上传到 Coveralls..."
        if command -v coveralls &> /dev/null; then
            cat coverage/lcov.info | coveralls || print_message $YELLOW "⚠️ Coveralls 上传失败"
        else
            npx coveralls < coverage/lcov.info || print_message $YELLOW "⚠️ Coveralls 上传失败"
        fi
    else
        print_message $YELLOW "⚠️ 未配置 Coveralls Token，跳过上传"
    fi

    # 上传到 Codecov
    if [ -n "$CODECOV_TOKEN" ]; then
        print_message $BLUE "📤 上传到 Codecov..."
        if command -v codecov &> /dev/null; then
            codecov -f coverage/lcov.info || print_message $YELLOW "⚠️ Codecov 上传失败"
        else
            curl -s https://codecov.io/bash | bash -s -- -t "$CODECOV_TOKEN" -f coverage/lcov.info || print_message $YELLOW "⚠️ Codecov 上传失败"
        fi
    else
        print_message $YELLOW "⚠️ 未配置 Codecov Token，跳过上传"
    fi

    print_message $GREEN "✅ 覆盖率数据上传完成"
}

# 函数：显示覆盖率报告
show_coverage_report() {
    print_message $BLUE "📋 显示覆盖率报告..."

    if [ -f "coverage/coverage-summary.json" ]; then
        echo ""
        print_message $GREEN "📊 覆盖率详细报告:"
        echo ""

        if command -v jq &> /dev/null; then
            # 显示总体统计
            jq -r '
                "📈 总体覆盖率:",
                "  📝 行: " + (.total.lines.pct | tostring) + "% (" + (.total.lines.covered | tostring) + "/" + (.total.lines.total | tostring) + ")",
                "  🔧 函数: " + (.total.functions.pct | tostring) + "% (" + (.total.functions.covered | tostring) + "/" + (.total.functions.total | tostring) + ")",
                "  🌿 分支: " + (.total.branches.pct | tostring) + "% (" + (.total.branches.covered | tostring) + "/" + (.total.branches.total | tostring) + ")",
                "  📖 语句: " + (.total.statements.pct | tostring) + "% (" + (.total.statements.covered | tostring) + "/" + (.total.statements.total | tostring) + ")",
                "",
                "📁 文件级覆盖率:"
            ' coverage/coverage-summary.json

            # 显示前10个文件的覆盖率
            jq -r '
                to_entries[] |
                select(.key | endswith(".ts") or endswith(".js")) |
                "  📄 " + .key + ": " + (.value.lines.pct | tostring) + "%"
            ' coverage/coverage-summary.json | head -10
        else
            cat coverage/coverage-summary.json
        fi

        echo ""
        print_message $BLUE "🌐 HTML 报告: coverage/lcov-report/index.html"
        print_message $BLUE "📄 LCOV 数据: coverage/lcov.info"
    else
        print_message $RED "❌ 覆盖率报告不存在"
    fi
}

# 函数：监控模式
watch_mode() {
    print_message $BLUE "👀 启动覆盖率监控模式..."

    while true; do
        echo ""
        print_message $BLUE "🔄 $(date): 运行覆盖率检查..."

        if run_coverage_tests && parse_coverage_data; then
            check_coverage_thresholds || true
            generate_trend_report
            generate_coverage_badge
            show_coverage_report
        fi

        print_message $BLUE "⏰ 等待下次检查... (60秒)"
        sleep 60
    done
}

# 函数：显示帮助信息
show_help() {
    echo "覆盖率监控脚本使用说明:"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示帮助信息"
    echo "  -r, --run           运行覆盖率测试 (默认)"
    echo "  -w, --watch         监控模式，定期运行测试"
    echo "  -u, --upload        上传覆盖率数据到外部服务"
    echo "  -b, --badge         生成覆盖率徽章"
    echo "  -t, --trend         生成趋势报告"
    echo "  --show              显示覆盖率报告"
    echo "  --check-thresholds  仅检查覆盖率阈值"
    echo "  --lines NUM         设置行覆盖率阈值 (默认: 80)"
    echo "  --functions NUM     设置函数覆盖率阈值 (默认: 80)"
    echo "  --branches NUM      设置分支覆盖率阈值 (默认: 80)"
    echo "  --statements NUM    设置语句覆盖率阈值 (默认: 80)"
    echo ""
    echo "环境变量:"
    echo "  COVERAGE_LINES_THRESHOLD     行覆盖率阈值"
    echo "  COVERAGE_FUNCTIONS_THRESHOLD 函数覆盖率阈值"
    echo "  COVERAGE_BRANCHES_THRESHOLD  分支覆盖率阈值"
    echo "  COVERAGE_STATEMENTS_THRESHOLD 语句覆盖率阈值"
    echo "  COVERALLS_REPO_TOKEN         Coveralls 仓库 Token"
    echo "  CODECOV_TOKEN                Codecov Token"
    echo ""
    echo "示例:"
    echo "  $0                  # 运行覆盖率测试"
    echo "  $0 --watch          # 监控模式"
    echo "  $0 --upload         # 运行测试并上传数据"
    echo "  COVERAGE_LINES_THRESHOLD=90 $0 # 设置90%的行覆盖率阈值"
}

# 主函数
main() {
    local run_tests=true
    local watch_mode_enabled=false
    local upload_data=false
    local generate_badge=false
    local generate_trend=false
    local show_report=false
    local check_thresholds_only=false

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -r|--run)
                run_tests=true
                shift
                ;;
            -w|--watch)
                watch_mode_enabled=true
                shift
                ;;
            -u|--upload)
                upload_data=true
                shift
                ;;
            -b|--badge)
                generate_badge=true
                shift
                ;;
            -t|--trend)
                generate_trend=true
                shift
                ;;
            --show)
                show_report=true
                shift
                ;;
            --check-thresholds)
                check_thresholds_only=true
                shift
                ;;
            --lines)
                export COVERAGE_LINES_THRESHOLD="$2"
                shift 2
                ;;
            --functions)
                export COVERAGE_FUNCTIONS_THRESHOLD="$2"
                shift 2
                ;;
            --branches)
                export COVERAGE_BRANCHES_THRESHOLD="$2"
                shift 2
                ;;
            --statements)
                export COVERAGE_STATEMENTS_THRESHOLD="$2"
                shift 2
                ;;
            *)
                print_message $RED "❌ 未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 检查工具
    check_coverage_tools

    # 监控模式
    if [ "$watch_mode_enabled" = true ]; then
        watch_mode
        exit 0
    fi

    # 仅检查阈值
    if [ "$check_thresholds_only" = true ]; then
        if parse_coverage_data; then
            check_coverage_thresholds
        fi
        exit $?
    fi

    # 运行覆盖率测试
    if [ "$run_tests" = true ]; then
        run_coverage_tests || exit 1
        parse_coverage_data || exit 1
        check_coverage_thresholds || true
    fi

    # 生成额外报告
    if [ "$generate_trend" = true ]; then
        generate_trend_report
    fi

    if [ "$generate_badge" = true ]; then
        generate_coverage_badge
    fi

    # 上传数据
    if [ "$upload_data" = true ]; then
        upload_coverage_data
    fi

    # 显示报告
    if [ "$show_report" = true ]; then
        show_coverage_report
    fi

    print_message $GREEN "🎉 覆盖率监控完成"
}

# 运行主函数
main "$@"