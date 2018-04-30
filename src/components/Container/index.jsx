import React from 'react';
import PropTypes from 'prop-types';
import { BulletList } from 'react-content-loader';
import Heading from '../Heading';
import Error from '../Error';

const {
  bool, node, string, shape, number,
} = PropTypes;

const Container = ({
  title, subtitle, style, className, children, error, loading, hide, titleTo, loaderWidth, loaderHeight,
}) => (!hide ? (
  <div className={className} style={{ ...style }}>
    {title && <Heading title={title} subtitle={subtitle} titleTo={titleTo} />}
    {error && <Error />}
    {!error && loading && <BulletList primaryColor="#666" width={loaderWidth || 400} height={loaderHeight || 160} />}
    {!error && !loading && children}
  </div>
) : null);

Container.propTypes = {
  title: string,
  subtitle: string,
  style: shape({}),
  className: string,
  loading: bool,
  error: bool,
  children: node,
  hide: bool,
  titleTo: string,
  loaderWidth: number,
  loaderHeight: number,
};

export default Container;
