import React, { Component } from 'react';
import ChangeLog from '../changelog/changelog';
import LeaderBoard from './leaderboard/leaderboard';
import Challenge from '../challenge/challenge';

class CoreHome extends Component {
  render() {
    return (
      <div className="container">
        <Challenge connectedUser={this.props.connectedUser}/>
        <ChangeLog />
        <LeaderBoard />
      </div>
    );
  }
}

export default CoreHome;
