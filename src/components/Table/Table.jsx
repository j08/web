import React from 'react';
import PropTypes from 'prop-types';
import {
  Table as MaterialTable,
  TableBody as MaterialTableBody,
  TableHeader as MaterialTableHeader,
  TableRow as MaterialTableRow,
  TableRowColumn as MaterialTableRowColumn,
} from 'material-ui/Table';
import { abbreviateNumber, SORT_ENUM, defaultSort } from '../../utility';
import { TablePercent } from '../Visualizations';
import Pagination from '../Table/PaginatedTable/Pagination';
import TableHeader from './TableHeader';
import Error from '../Error';
import TableSkeleton from '../Skeletons/TableSkeleton';
import { StyledBody, StyledContainer } from './Styled';

const getColumnMax = (data, field, getValue) => {
  const valuesArr = data.reduce((arr, row) => {
    const value = getValue ? getValue(row) : row[field];
    const num = Number(value);
    if (Number.isNaN(num)) {
      return arr;
    }
    arr.push(value);
    return arr;
  }, []);
  return Math.max(...valuesArr);
};

const getColumnMin = (data, field, getValue) => {
  const valuesArr = data.reduce((arr, row) => {
    const value = getValue ? getValue(row) : row[field];
    const num = Number(value);
    if (Number.isNaN(num)) {
      return arr;
    }
    arr.push(value);
    return arr;
  }, []);
  return Math.min(...valuesArr);
};

const toUnderline = (data, row, field, underline) => {
  const x = [];
  data.forEach((r) => {
    x.push(r[field]);
  });
  x.sort((a, b) => a - b);
  if ((underline === 'min' && x[0] === row[field]) || ((underline === 'max' && x[x.length - 1] === row[field]))) {
    return true;
  }
  return false;
};

const rowStyle = (highlightFn, row) => ({ backgroundColor: highlightFn && highlightFn(row) ? 'rgba(74, 149, 247, 0.038)' : 'none' });

const initialState = {
  currentPage: 0,
  sortState: '',
  sortField: '',
  sortFn: f => f,
};

const {
  arrayOf,
  bool,
  shape,
  number,
  string,
  func,
} = PropTypes;

class Table extends React.Component {
  static propTypes = {
    data: arrayOf(shape({})).isRequired,
    columns: arrayOf(shape({})).isRequired,
    loading: bool,
    error: bool,
    summable: bool,
    maxRows: number,
    paginated: bool,
    placeholderMessage: string,
    pageLength: number,
    hoverRowColumn: bool,
    highlightFn: func,
    keyFn: func,
  }

  static renderSumRow({ columns, data }) {
    return (
      <MaterialTableRow>
        {columns.map((column, colIndex) => {
            let total = 0;
            if (column.sumFn) {
              const sumFn = (typeof column.sumFn === 'function') ? column.sumFn : (acc, row) => (acc + row[column.field]);
              total = data.reduce(sumFn, null);
            }

            return (
              <MaterialTableRowColumn key={`${colIndex}_sum`} style={{ color: column.color }}>
                {column.sumFn && ((column.displaySumFn) ? column.displaySumFn(total) : abbreviateNumber(total))}
              </MaterialTableRowColumn>
            );
          })}
      </MaterialTableRow>
    );
  }

  state = initialState;

  setTableRef = (node) => {
    if (node) {
      this.innerContainerRef = node;
      const { tableDiv } = this.innerContainerRef.refs;
      // only shrink first column if there is enough wiggle room
      this.doShrink = (tableDiv.scrollWidth - tableDiv.clientWidth) > 90;
      tableDiv.onscroll = this.handleScroll;
    }
  }

  setCurrentPage = (pageNumber) => {
    this.setState({
      currentPage: pageNumber,
    });
  };

  handleScroll = () => {
    const { scrolled } = this.state;
    const { scrollLeft } = this.innerContainerRef.refs.tableDiv;
    if ((!scrolled && scrollLeft) || (scrolled && !scrollLeft)) {
      this.setState({
        scrolled: scrollLeft,
      });
    }
  }

  nextPage = () => {
    this.setState({
      currentPage: this.state.currentPage + 1,
    });
  };

  prevPage = () => {
    this.setState({
      currentPage: this.state.currentPage - 1,
    });
  };

  sortClick = (sortField, sortState, sortFn) => {
    const { state } = this;
    this.setState({
      sortState: sortField === state.sortField ? SORT_ENUM.next(SORT_ENUM[state.sortState]) : SORT_ENUM[0],
      sortField,
      sortFn,
    });
  };

  render() {
    const {
      columns,
      loading,
      error,
      summable,
      maxRows,
      paginated,
      placeholderMessage,
      pageLength = 20,
      hoverRowColumn,
      highlightFn,
      keyFn,
    } = this.props;
    const {
      sortState, sortField, sortFn, currentPage, scrolled,
    } = this.state;
    const dataLength = this.props.data.length;
    let { data } = this.props;
    if (maxRows && maxRows <= dataLength) {
      data = data.slice(0, maxRows);
    }
    if (sortField) {
      data = defaultSort(data.slice(0), sortState, sortField, sortFn);
    }
    if (paginated) {
      data = data.slice(currentPage * pageLength, (currentPage + 1) * pageLength);
    }
    return (
      <StyledBody hoverRowColumn={hoverRowColumn} >
        {paginated && <Pagination
          numPages={Math.ceil(dataLength / pageLength)}
          currentPage={currentPage}
          nextPage={this.nextPage}
          prevPage={this.prevPage}
          setCurrentPage={this.setCurrentPage}
          place="top"
        />}
        <StyledContainer >
          {loading && <TableSkeleton />}
          {!loading && error && <Error />}
          {!loading && !error && dataLength <= 0 && <div>{placeholderMessage}</div>}
          {!loading && !error && dataLength > 0 && (
          <div className={`innerContainer ${scrolled && 'scrolled'} ${this.doShrink && 'shrink'}`}>
            <MaterialTable fixedHeader={false} selectable={false} ref={this.setTableRef}>
              <MaterialTableHeader displaySelectAll={false} adjustForCheckbox={false}>
                <TableHeader
                  columns={columns}
                  sortState={sortState}
                  sortField={sortField}
                  sortClick={this.sortClick}
                />
              </MaterialTableHeader>
              <MaterialTableBody displayRowCheckbox={false} selectable={false}>
                {data.map((row, index) => (
                  <MaterialTableRow key={(keyFn && keyFn(row)) || index} style={rowStyle(highlightFn, row)}>
                    {columns.map((column, colIndex) => {
                      const {
                        field, color, center, displayFn, relativeBars, percentBars,
                        percentBarsWithValue, invertBarColor, underline, colColor,
                      } = column;
                      const columnSortFn = column.sortFn;
                      const getValue = typeof columnSortFn === 'function' ? columnSortFn : null;
                      const value = getValue ? getValue(row) : row[field];
                      const style = {
                        overflow: `${field === 'kills' ? 'visible' : null}`,
                        backgroundColor: colColor,
                        color,
                        marginBottom: 0,
                        textUnderlinePosition: 'under',
                        textDecorationColor: 'rgb(140, 140, 140)',
                      };

                      if (center) {
                        style.textAlign = 'center';
                      }
                      if (!row) {
                        return (
                          <MaterialTableRowColumn
                            key={`${index}_${colIndex}`}
                            style={style}
                          />
                        );
                      }

                      let fieldEl = null;
                      const bars = relativeBars || percentBars || percentBarsWithValue;
                      if (bars) {
                        const altValue = typeof bars === 'function' && percentBarsWithValue ? bars(row) : null;
                        let valEl = null;
                        let barPercentValue = 0;
                        if (relativeBars) {
                          // Relative bars calculates the max for the column
                          // and gets the percentage of value/max
                          // TODO masad-frost memoize or something
                          const min = getColumnMin(data, field, getValue);
                          let max = getColumnMax(data, field, getValue);
                          let valueWithOffset = value;
                          if (!Number.isNaN(Number(min)) && min < 0) {
                            // Rescale to cater for columns with negatives
                            max -= min;
                            valueWithOffset -= min;
                          }

                          const isValidNumber = !Number.isNaN(Number(valueWithOffset));
                          barPercentValue = max !== 0 && isValidNumber
                            ? Number((valueWithOffset * 100 / max).toFixed(1))
                            : 0;
                          valEl = displayFn
                            ? displayFn(row, column, value, index, barPercentValue)
                            : <span>{value}</span>;
                        } else {
                          // Percent bars assumes that the value is in decimal
                          barPercentValue = Number((value * 100).toFixed(1)) || 0;
                          valEl = displayFn
                            ? displayFn(row, column, value, index, barPercentValue)
                            : <span>{barPercentValue}</span>;
                        }

                        fieldEl = (<TablePercent
                          valEl={valEl}
                          percent={barPercentValue}
                          altValue={altValue}
                          inverse={invertBarColor}
                        />);
                      } else if (displayFn) {
                        fieldEl = displayFn(row, column, value, index);
                      } else {
                        fieldEl = value;
                      }
                      if (underline === 'max' || underline === 'min') {
                        style.textDecoration = toUnderline(data, row, field, underline) ? 'underline' : 'none';
                      }
                      return (
                        <MaterialTableRowColumn key={`${index}_${colIndex}`} style={style}>
                          {fieldEl}
                        </MaterialTableRowColumn>
                      );
                    })}
                  </MaterialTableRow>
                ))}
                {summable && Table.renderSumRow({ columns, data })}
              </MaterialTableBody>
            </MaterialTable>
          </div>)}
        </StyledContainer>
        {paginated && <Pagination
          numPages={Math.ceil(dataLength / pageLength)}
          currentPage={currentPage}
          pageLength={pageLength}
          length={dataLength}
          nextPage={this.nextPage}
          prevPage={this.prevPage}
          setCurrentPage={this.setCurrentPage}
          place="bot"
        />}
      </StyledBody>
    );
  }
}

export default Table;
