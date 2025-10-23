import { Component } from 'react'
import './app.scss'

class App extends Component {
  // 运行前调用
  componentWillMount() {}

  // 运行后调用
  componentDidMount() {}

  // 更新前调用
  componentWillUpdate() {}

  // 卸载前调用
  componentWillUnmount() {}

  componentDidShow() {}

  componentDidHide() {}

  // this.props.children 是页面实例
  render() {
    return this.props.children
  }
}

export default App 