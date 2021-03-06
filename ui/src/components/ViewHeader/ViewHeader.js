import React from 'react';
import './ViewHeader.scss'

let ViewHeader = (props) => {
  return (
    <header className="view-header">
      Analysis for {props.currentGeoName}
    </header>
  );
};

export default ViewHeader;